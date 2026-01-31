<?php

namespace App\Services;

use App\Models\Theme;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
class ThemeService
{
    protected ThemeCssGeneratorService $cssGenerator;

    public function __construct(ThemeCssGeneratorService $cssGenerator)
    {
        $this->cssGenerator = $cssGenerator;
    }

    /**
     * Get the current user ID or fall back to superadmin for system operations.
     */
    private function getCurrentUserId(): int
    {
        return Auth::id() ?? User::where('email', 'superadmin@byteforge.se')->value('id') ?? 1;
    }
    /**
     * Activate a theme for a tenant.
     * If theme doesn't exist in DB, return null.
     * Copies placeholder content to theme_parts for the tenant/central scope.
     */
    public function activateTheme(string $themeSlug, ?string $tenantId = null): ?Theme
    {
        // Find the theme by slug
        $theme = Theme::where('slug', $themeSlug)->first();

        if (!$theme) {
            return null;
        }

        // Copy placeholder content to theme_parts for this tenant/central
        // Only if theme_parts don't already exist for this scope
        $this->ensureThemePartsExist($theme, $tenantId);

        // Activate the theme for this tenant/central
        $theme->activate($tenantId);

        return $theme;
    }

    /**
     * Ensure theme_parts exist for a theme in the given tenant scope.
     * Copies from placeholders if they don't exist yet.
     */
    private function ensureThemePartsExist(Theme $theme, ?string $tenantId): void
    {
        // Check if theme_parts already exist for this tenant/central
        $existingParts = \App\Models\ThemePart::where('theme_id', $theme->id)
            ->where('tenant_id', $tenantId)
            ->exists();

        if ($existingParts) {
            return; // Already have customized parts, don't overwrite
        }

        // Copy placeholders to theme_parts for this tenant/central scope
        $placeholders = \App\Models\ThemePlaceholder::where('theme_id', $theme->id)->get();

        foreach ($placeholders as $placeholder) {
            \App\Models\ThemePart::create([
                'tenant_id' => $tenantId,
                'theme_id' => $theme->id,
                'name' => $theme->name . ' ' . ucfirst($placeholder->type),
                'slug' => $theme->slug . '-' . $placeholder->type . '-' . ($tenantId ?? 'central'),
                'type' => $placeholder->type,
                'puck_data_raw' => $placeholder->content,
                'puck_data_compiled' => null,
                'status' => 'published',
                'sort_order' => 0,
                'created_by' => $this->getCurrentUserId(),
            ]);
        }
    }

    /**
     * Clone a system theme with its bundle (theme parts + page templates).
     */
    private function cloneSystemTheme(Theme $systemTheme, ?string $tenantId): Theme
    {
        // Create a copy of the theme for the tenant
        $theme = Theme::create([
            'tenant_id' => $tenantId,
            'name' => $systemTheme->name,
            'slug' => $systemTheme->slug,
            'base_theme' => $systemTheme->base_theme,
            'theme_data' => $systemTheme->theme_data,
            'description' => $systemTheme->description,
            'preview_image' => $systemTheme->preview_image,
            'author' => $systemTheme->author,
            'version' => $systemTheme->version,
            'is_active' => false,
            'is_system_theme' => false, // Tenant copy is not a system theme
        ]);

        // Clone theme placeholders to theme_parts instances
        // This creates a hard wall: blueprint placeholders → theme_parts instances
        $placeholders = \App\Models\ThemePlaceholder::where('theme_id', $systemTheme->id)->get();

        foreach ($placeholders as $placeholder) {
            \App\Models\ThemePart::create([
                'tenant_id' => $tenantId,
                'theme_id' => $theme->id,
                'name' => $theme->name . ' ' . ucfirst($placeholder->type),
                'slug' => $theme->slug . '-' . $placeholder->type,
                'type' => $placeholder->type,
                'puck_data_raw' => $placeholder->content, // Copy placeholder content
                'puck_data_compiled' => null,
                'status' => 'published',
                'sort_order' => 0,
                'created_by' => $this->getCurrentUserId(),
            ]);
        }

        // Clone page templates
        $templates = \App\Models\PageTemplate::whereNull('tenant_id')
            ->where('theme_id', $systemTheme->id)
            ->get();

        foreach ($templates as $template) {
            \App\Models\PageTemplate::create([
                'tenant_id' => $tenantId,
                'theme_id' => $theme->id,
                'name' => $template->name,
                'slug' => $template->slug,
                'description' => $template->description,
                'category' => $template->category,
                'preview_image' => $template->preview_image,
                'puck_data' => $template->puck_data,
                'meta' => $template->meta,
                'is_active' => $template->is_active,
                'usage_count' => 0, // Reset usage count for tenant copy
            ]);
        }

        return $theme;
    }

    /**
     * Get the active theme for a tenant.
     */
    public function getActiveTheme(?string $tenantId = null): ?Theme
    {
        return Theme::forTenant($tenantId)
            ->active()
            ->first();
    }

    /**
     * Get or create default theme for a tenant.
     */
    public function getOrCreateDefaultTheme(?string $tenantId = null): ?Theme
    {
        $activeTheme = $this->getActiveTheme($tenantId);

        if ($activeTheme) {
            return $activeTheme;
        }

        // No active theme, try to activate a default one
        // First, try to find any system theme to activate
        $systemTheme = Theme::whereNull('tenant_id')
            ->where('is_system_theme', true)
            ->first();

        if ($systemTheme) {
            return $this->activateTheme($systemTheme->slug, $tenantId);
        }

        // No system themes available
        return null;
    }

    /**
     * Update theme data.
     */
    public function updateTheme(Theme $theme, array $updates): Theme
    {
        // Merge updates into existing theme_data
        $themeData = $theme->theme_data;
        $themeData = $this->deepMerge($themeData, $updates);

        $theme->theme_data = $themeData;
        $theme->save();

        // Note: CSS generation now handled by section-based approach (ThemeCssPublishService)
        // No longer generating monolithic CSS file here

        return $theme;
    }

    /**
     * Deep merge two arrays.
     */
    private function deepMerge(array $array1, array $array2): array
    {
        $merged = $array1;

        foreach ($array2 as $key => $value) {
            if (is_array($value) && isset($merged[$key]) && is_array($merged[$key])) {
                $merged[$key] = $this->deepMerge($merged[$key], $value);
            } else {
                $merged[$key] = $value;
            }
        }

        return $merged;
    }

    /**
     * Reset theme to base theme.
     */
    public function resetTheme(Theme $theme): bool
    {
        return $theme->resetToBase();
    }

    /**
     * Duplicate a theme.
     */
    public function duplicateTheme(Theme $theme, string $newName): Theme
    {
        $newSlug = Str::slug($newName);
        $counter = 1;

        // Ensure unique slug
        while (Theme::forTenant($theme->tenant_id)->where('slug', $newSlug)->exists()) {
            $newSlug = Str::slug($newName) . '-' . $counter;
            $counter++;
        }

        return Theme::create([
            'tenant_id' => $theme->tenant_id,
            'name' => $newName,
            'slug' => $newSlug,
            'base_theme' => $theme->base_theme,
            'theme_data' => $theme->theme_data,
            'description' => $theme->description,
            'author' => $theme->author,
            'version' => $theme->version,
            'is_active' => false,
        ]);
    }

    /**
     * Export theme as JSON file.
     */
    public function exportTheme(Theme $theme): array
    {
        return [
            'name' => $theme->name,
            'description' => $theme->description,
            'author' => $theme->author,
            'version' => $theme->version,
            'data' => $theme->theme_data,
        ];
    }

    /**
     * Import theme from uploaded JSON.
     */
    public function importTheme(array $themeData, ?string $tenantId = null): Theme
    {
        $slug = Str::slug($themeData['name'] ?? 'imported-theme');
        $counter = 1;

        // Ensure unique slug
        while (Theme::forTenant($tenantId)->where('slug', $slug)->exists()) {
            $slug = Str::slug($themeData['name'] ?? 'imported-theme') . '-' . $counter;
            $counter++;
        }

        return Theme::create([
            'tenant_id' => $tenantId,
            'name' => $themeData['name'] ?? 'Imported Theme',
            'slug' => $slug,
            'base_theme' => null, // Imported themes don't have base
            'theme_data' => $themeData['data'] ?? $themeData,
            'description' => $themeData['description'] ?? null,
            'author' => $themeData['author'] ?? null,
            'version' => $themeData['version'] ?? '1.0.0',
            'is_active' => false,
        ]);
    }

    /**
     * Get templates from a theme
     */
    public function getTemplatesFromTheme(string $themeSlug, ?string $tenantId = null): array
    {
        // Get from installed theme in database
        $theme = Theme::forTenant($tenantId)
            ->where('slug', $themeSlug)
            ->first();

        if ($theme && isset($theme->theme_data['templates'])) {
            return $theme->theme_data['templates'];
        }

        return [];
    }

    /**
     * Get templates from active theme
     *
     * Phase 6 Step 7: Fixed to query page_templates table instead of theme_data
     */
    public function getTemplatesFromActiveTheme(?string $tenantId = null): array
    {
        $theme = $this->getOrCreateDefaultTheme($tenantId);

        // Get from page_templates table, not theme_data
        $templates = \App\Models\PageTemplate::where('theme_id', $theme->id)
            ->where('is_active', true);

        // Scope to tenant if provided
        if ($tenantId !== null) {
            $templates->where('tenant_id', $tenantId);
        } else {
            $templates->whereNull('tenant_id');
        }

        return $templates->get()->toArray();
    }
}

