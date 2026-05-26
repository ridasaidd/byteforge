<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Services\ThemeCssSectionService;
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
        // Tenant context is resolved from the current tenant (set by tenancy middleware),
        // NOT from request input — accepting tenant_id from the caller would allow
        // unauthenticated enumeration of any tenant's theme data.
        $tenantId = tenant()?->id ?? null;

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
    protected ThemeCssSectionService $sectionService;
    protected NormalizeInputFieldsAction $normalizeInputFields;

    public function __construct(ThemeService $themeService, ThemeCssSectionService $sectionService, NormalizeInputFieldsAction $normalizeInputFields)
    {
        $this->themeService = $themeService;
        $this->sectionService = $sectionService;
        $this->normalizeInputFields = $normalizeInputFields;
    }

    /**
     * Get tenant ID based on context (central vs tenant).
     * Uses tenancy()->initialized for reliable context detection,
     * not URL pattern matching.
     */
    private function getTenantId(): ?string
    {
        return tenancy()->initialized ? tenancy()->tenant->id : null;
    }



    /**
     * Get all installed themes from database.
     */
    public function index()
    {
        $tenantId = $this->getTenantId();

        if ($tenantId === null) {
            $themes = Theme::forTenant(null)
                ->orderBy('is_active', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'data' => $themes,
            ]);
        }

        $activeTheme = $this->themeService->getActiveTheme($tenantId);

        // Slugs the tenant already has cloned — suppress matching system themes to avoid duplicates.
        $clonedSlugs = Theme::where('tenant_id', $tenantId)->pluck('slug')->all();

        // Tenant scope can use its own themes plus uncloned system themes.
        $themes = Theme::query()
            ->where(function ($query) use ($tenantId, $clonedSlugs) {
                $query->where('tenant_id', $tenantId)
                    ->orWhere(function ($system) use ($clonedSlugs) {
                        $system->whereNull('tenant_id')
                            ->where('is_system_theme', true);
                        if (!empty($clonedSlugs)) {
                            $system->whereNotIn('slug', $clonedSlugs);
                        }
                    });
            })
            ->orderByDesc('tenant_id')
            ->orderBy('name')
            ->get()
            ->map(function (Theme $theme) use ($activeTheme) {
                $theme->is_active = $activeTheme !== null && $theme->id === $activeTheme->id;
                return $theme;
            })
            ->values();

        return response()->json([
            'data' => $themes,
        ]);
    }

    /**
     * Get available system themes (themes that can be activated).
     * Returns system themes from central database.
     */
    public function available()
    {
        // Get system themes (central themes with is_system_theme = true)
        $themes = Theme::whereNull('tenant_id')
            ->where('is_system_theme', true)
            ->orderBy('name')
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
        $theme = $this->themeService->getActiveTheme($tenantId);

        if (!$theme) {
            return response()->json([
                'message' => 'No active theme found',
            ], 404);
        }

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
        // Check permission for theme management
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Only allow theme creation in central context
        if ($this->getTenantId() !== null) {
            return response()->json([
                'message' => 'Theme creation is only available in the central app.',
            ], 403);
        }

        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['name'],
            multilineFields: ['description'],
        ), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'preview_image' => 'nullable|string',
            'is_system_theme' => 'nullable|boolean',
            'base_theme' => 'nullable|string',
            'theme_data' => 'nullable|array',
        ])->validate();

        $tenantId = $this->getTenantId();

        // Generate slug from name
        $slug = \Illuminate\Support\Str::slug($validated['name']);

        // Ensure unique slug for this tenant
        $originalSlug = $slug;
        $counter = 1;
        while (Theme::where('tenant_id', $tenantId)->where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $theme = Theme::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'preview_image' => $validated['preview_image'] ?? null,
            'is_system_theme' => $validated['is_system_theme'] ?? false,
            'base_theme' => $validated['base_theme'] ?? null,
            'theme_data' => $validated['theme_data'] ?? [],
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
        // Check permission for theme management
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Only allow theme editing in central context
        if ($this->getTenantId() !== null) {
            return response()->json([
                'message' => 'Theme editing is only available in the central app.',
            ], 403);
        }

        $tenantId = $this->getTenantId();

        // Ensure theme belongs to current tenant
        if ($theme->tenant_id !== $tenantId) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['name'],
            multilineFields: ['description'],
        ), [
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'preview_image' => 'nullable|string',
            'theme_data' => 'nullable|array',
        ])->validate();

        // Update basic fields if provided
        if (array_key_exists('name', $validated)) {
            $theme->name = $validated['name'];
        }
        if (array_key_exists('description', $validated)) {
            $theme->description = $validated['description'];
        }
        if (array_key_exists('preview_image', $validated)) {
            $theme->preview_image = $validated['preview_image'];
        }

        // Update theme_data if provided
        if (array_key_exists('theme_data', $validated)) {
            $theme = $this->themeService->updateTheme($theme, $validated['theme_data']);
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

        $success = $this->themeService->resetTheme($theme, $tenantId);

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

        $validator = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['name'],
        ), [
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newTheme = $this->themeService->duplicateTheme($theme, $validator->validated()['name']);

        return response()->json([
            'data' => $newTheme,
            'message' => 'Theme duplicated successfully',
        ], 201);
    }

    /**
     * Delete a theme.
     */
    public function destroy(Request $request, Theme $theme)
    {
        // Check permission for theme management
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

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

        $themeId = $theme->id;
        $theme->delete();

        // Clean up the theme's CSS folder from storage so no orphaned files accumulate.
        $this->sectionService->deleteThemeFolder($themeId);

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
