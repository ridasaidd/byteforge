<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Services\ThemeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ThemeController extends Controller
{


    /**
     * Public endpoint: Get active theme data for rendering (no auth required).
     */
    public function publicTheme(Request $request)
    {
        // Determine tenant context (e.g., from domain, request param, etc.)
        $tenantId = $request->get('tenant_id') ?? null; // Adapt as needed

        $theme = $this->themeService->getActiveTheme($tenantId);

        if (!$theme) {
            return response()->json([
                'message' => 'No active theme found',
            ], 404);
        }

        return response()->json([
            'data' => $theme->theme_data,
            'name' => $theme->name,
            'slug' => $theme->slug,
            'author' => $theme->author,
            'version' => $theme->version,
            'description' => $theme->description,
        ]);
    }
    protected ThemeService $themeService;

    public function __construct(ThemeService $themeService)
    {
        $this->themeService = $themeService;
    }

    /**
     * Get tenant ID based on context (central vs tenant).
     */
    private function getTenantId(): ?string
    {
        // For central context, return null
        // For tenant context, return tenant_id from the current tenant
        if (request()->is('api/superadmin/*')) {
            return null;
        }

        // Assuming tenant() helper exists for multi-tenancy
        return tenant()?->id;
    }



    /**
     * Get all installed themes from database.
     */
    public function index()
    {
        $tenantId = $this->getTenantId();

        $themes = Theme::forTenant($tenantId)
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $themes,
        ]);
    }

    /**
     * Get the active theme.
     */
    public function active()
    {
        $tenantId = $this->getTenantId();
        $theme = $this->themeService->getOrCreateDefaultTheme($tenantId);

        return response()->json([
            'data' => $theme,
        ]);
    }

    /**
     * Get a specific theme.
     */
    public function show(Theme $theme)
    {
        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        return response()->json([
            'data' => $theme,
        ]);
    }

    /**
     * Create a new theme.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'preview_image' => 'nullable|string',
            'is_system_theme' => 'nullable|boolean',
            'base_theme' => 'nullable|string',
            'theme_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenantId = $this->getTenantId();

        // Generate slug from name
        $slug = \Illuminate\Support\Str::slug($request->name);

        // Ensure unique slug for this tenant
        $originalSlug = $slug;
        $counter = 1;
        while (Theme::where('tenant_id', $tenantId)->where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $theme = Theme::create([
            'tenant_id' => $tenantId,
            'name' => $request->name,
            'slug' => $slug,
            'description' => $request->description,
            'preview_image' => $request->preview_image,
            'is_system_theme' => $request->is_system_theme ?? false,
            'base_theme' => $request->base_theme,
            'theme_data' => $request->theme_data ?? [],
            'is_active' => false,
            'author' => $request->user()?->name ?? 'Unknown',
            'version' => '1.0.0',
        ]);

        return response()->json([
            'data' => $theme,
            'message' => 'Theme created successfully',
        ], 201);
    }

    /**
     * Activate a theme.
     */
    public function activate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'slug' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenantId = $this->getTenantId();
        $theme = $this->themeService->activateTheme($request->slug, $tenantId);

        if (!$theme) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        return response()->json([
            'data' => $theme,
            'message' => 'Theme activated successfully',
        ]);
    }

    /**
     * Update theme customizations.
     */
    public function update(Request $request, Theme $theme)
    {
        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'preview_image' => 'nullable|string',
            'theme_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Update basic fields if provided
        if ($request->has('name')) {
            $theme->name = $request->name;
        }
        if ($request->has('description')) {
            $theme->description = $request->description;
        }
        if ($request->has('preview_image')) {
            $theme->preview_image = $request->preview_image;
        }

        // Update theme_data if provided
        if ($request->has('theme_data')) {
            $theme = $this->themeService->updateTheme($theme, $request->theme_data);
        } else {
            $theme->save();
        }

        return response()->json([
            'data' => $theme->fresh(),
            'message' => 'Theme updated successfully',
        ]);
    }

    /**
     * Reset theme to base.
     */
    public function reset(Theme $theme)
    {
        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        $success = $this->themeService->resetTheme($theme);

        if (!$success) {
            return response()->json([
                'message' => 'Failed to reset theme. Base theme not found.',
            ], 400);
        }

        return response()->json([
            'data' => $theme->fresh(),
            'message' => 'Theme reset to base successfully',
        ]);
    }

    /**
     * Duplicate a theme.
     */
    public function duplicate(Request $request, Theme $theme)
    {
        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newTheme = $this->themeService->duplicateTheme($theme, $request->name);

        return response()->json([
            'data' => $newTheme,
            'message' => 'Theme duplicated successfully',
        ], 201);
    }

    /**
     * Delete a theme.
     */
    public function destroy(Theme $theme)
    {
        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        // Prevent deleting active theme
        if ($theme->is_active) {
            return response()->json([
                'message' => 'Cannot delete active theme',
            ], 400);
        }

        $theme->delete();

        return response()->json([
            'message' => 'Theme deleted successfully',
        ]);
    }

    /**
     * Export theme as JSON.
     */
    public function export(Theme $theme)
    {
        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        $exportData = $this->themeService->exportTheme($theme);

        return response()->json($exportData)
            ->header('Content-Disposition', 'attachment; filename="' . $theme->slug . '.json"');
    }

    // import method commented out; replaced by sync
    // public function import(Request $request)
    // {
    //     ...existing code...
    // }

    /**
     * Get templates from a specific theme.
     */
    public function templates(string $slug)
    {
        $tenantId = $this->getTenantId();
        $templates = $this->themeService->getTemplatesFromTheme($slug, $tenantId);

        return response()->json([
            'data' => $templates,
        ]);
    }

    /**
     * Get templates from active theme.
     */
    public function activeTemplates()
    {
        $tenantId = $this->getTenantId();
        $templates = $this->themeService->getTemplatesFromActiveTheme($tenantId);

        return response()->json([
            'data' => $templates,
        ]);
    }
}
