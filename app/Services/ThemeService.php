<?php

namespace App\Services;

use App\Models\Theme;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
class ThemeService
{
    protected ThemeCssGeneratorService $cssGenerator;
    protected ThemeCssPublishService $cssPublishService;

    public function __construct(ThemeCssGeneratorService $cssGenerator, ThemeCssPublishService $cssPublishService)
    {
        $this->cssGenerator = $cssGenerator;
        $this->cssPublishService = $cssPublishService;
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
        // Scope slug lookup to themes belonging to this tenant OR system themes (tenant_id IS NULL).
        // A fully global lookup would allow one tenant to activate another tenant's theme.
        $theme = Theme::where('slug', $themeSlug)
            ->where(function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            })
            ->first();

        if (!$theme) {
            return null;
        }

        // When a tenant activates a system theme (tenant_id = null), clone it as a
        // tenant-owned copy so getActiveTheme() can find it via tenant_id scoping.
        // Re-use an existing tenant copy if one already exists for this slug.
        $sourceSystemTheme = null;

        if ($tenantId !== null && is_null($theme->tenant_id)) {
            $sourceSystemTheme = $theme;
            $existing = Theme::where('slug', $themeSlug)
                ->where('tenant_id', $tenantId)
                ->first();

            $theme = $existing ?? $this->cloneSystemTheme($theme, $tenantId);
        }

        // Copy placeholder content to theme_parts for this tenant/central
        // Only if theme_parts don't already exist for this scope
        $this->ensureThemePartsExist($theme, $tenantId, $sourceSystemTheme);

        // Activate the theme for this tenant/central
        $theme->activate($tenantId);

        // Ensure storefront base CSS file exists for the activated theme.
        // Tenant theme clones often don't have their own copied CSS yet.
        $this->ensureThemeCssFileExistsForTheme($theme, $sourceSystemTheme, $tenantId !== null);

        return $theme;
    }

    /**
     * Ensure the published storefront CSS file exists for a theme.
     * If missing, try copying from the source system theme (same slug).
     */
    public function ensureThemeCssFileExistsForTheme(Theme $theme, ?Theme $sourceTheme = null, bool $forceCopyFromSource = false): void
    {
        // Use the 'themes' disk which is intentionally excluded from tenancy's filesystem
        // bootstrapper override list, so it always resolves to storage/app/public/themes/
        // regardless of whether the current request is in a tenant context.
        $disk = Storage::disk('themes');
        $targetPath = "{$theme->id}/{$theme->id}.css";

        if ($disk->exists($targetPath) && !$forceCopyFromSource) {
            return;
        }

        $candidateSourceThemes = [];

        if ($sourceTheme) {
            $candidateSourceThemes[] = $sourceTheme;
        }

        // Fallback: use matching system theme by slug.
        $systemTheme = Theme::whereNull('tenant_id')
            ->where('slug', $theme->slug)
            ->first();

        if ($systemTheme) {
            $candidateSourceThemes[] = $systemTheme;
        }

        foreach ($candidateSourceThemes as $candidate) {
            $sourcePath = "{$candidate->id}/{$candidate->id}.css";
            if ($disk->exists($sourcePath)) {
                if (!$disk->exists("{$theme->id}")) {
                    $disk->makeDirectory("{$theme->id}");
                }
                $disk->copy($sourcePath, $targetPath);
                return;
            }
        }

        // Last fallback: try republishing from section files for this theme.
        // If sections are missing/incomplete, keep silent to avoid breaking the request path.
        try {
            $this->cssPublishService->publishTheme($theme->id);
        } catch (\Throwable) {
            // no-op
        }
    }

    /**
     * Ensure theme_parts exist for a theme in the given tenant scope.
     * Copies from placeholders if they don't exist yet.
     */
    private function ensureThemePartsExist(Theme $theme, ?string $tenantId, ?Theme $sourceTheme = null): void
    {
        if ($sourceTheme === null) {
            $sourceTheme = Theme::whereNull('tenant_id')
                ->where('slug', $theme->slug)
                ->first();
        }

        // Check if theme_parts already exist for this tenant/central
        $existingParts = \App\Models\ThemePart::where('theme_id', $theme->id)
            ->where('tenant_id', $tenantId)
            ->exists();

        if ($existingParts) {
            // Legacy repair: copy missing CSS/content from source system theme parts.
            if ($sourceTheme) {
                foreach (['settings', 'header', 'footer'] as $type) {
                    $targetPart = \App\Models\ThemePart::where('theme_id', $theme->id)
                        ->where('tenant_id', $tenantId)
                        ->where('type', $type)
                        ->first();

                    $sourcePart = \App\Models\ThemePart::where('theme_id', $sourceTheme->id)
                        ->whereNull('tenant_id')
                        ->where('type', $type)
                        ->first();

                    if (!$targetPart || !$sourcePart) {
                        continue;
                    }

                    $dirty = false;
                    if (empty($targetPart->settings_css) && !empty($sourcePart->settings_css)) {
                        $targetPart->settings_css = $sourcePart->settings_css;
                        $dirty = true;
                    }

                    if (empty($targetPart->puck_data_raw) && !empty($sourcePart->puck_data_raw)) {
                        $targetPart->puck_data_raw = $sourcePart->puck_data_raw;
                        $dirty = true;
                    }

                    if ($dirty) {
                        $targetPart->save();
                    }
                }
            }

            return; // Already have customized parts, don't overwrite
        }

        // Prefer cloning fully-formed source theme parts (includes settings_css).
        if ($sourceTheme) {
            $sourceParts = \App\Models\ThemePart::where('theme_id', $sourceTheme->id)
                ->whereNull('tenant_id')
                ->whereIn('type', ['settings', 'header', 'footer'])
                ->get();

            if ($sourceParts->isNotEmpty()) {
                foreach ($sourceParts as $sourcePart) {
                    \App\Models\ThemePart::create([
                        'tenant_id' => $tenantId,
                        'theme_id' => $theme->id,
                        'name' => $theme->name . ' ' . ucfirst($sourcePart->type),
                        'slug' => $theme->slug . '-' . $sourcePart->type . '-' . ($tenantId ?? 'central'),
                        'type' => $sourcePart->type,
                        'puck_data_raw' => $sourcePart->puck_data_raw,
                        'puck_data_compiled' => $sourcePart->puck_data_compiled,
                        'settings_css' => $sourcePart->settings_css,
                        'status' => 'published',
                        'sort_order' => $sourcePart->sort_order ?? 0,
                        'created_by' => $this->getCurrentUserId(),
                    ]);
                }

                return;
            }
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
            // In tenant scope, template slugs are unique per tenant.
            // If a template already exists (same slug), relink/update it so the
            // currently activated theme keeps its template bundle intact.
            if ($tenantId !== null) {
                $existingTemplate = \App\Models\PageTemplate::where('tenant_id', $tenantId)
                    ->where('slug', $template->slug)
                    ->first();

                if ($existingTemplate) {
                    $existingTemplate->update([
                        'theme_id' => $theme->id,
                        'name' => $template->name,
                        'description' => $template->description,
                        'category' => $template->category,
                        'preview_image' => $template->preview_image,
                        'puck_data' => $template->puck_data,
                        'meta' => $template->meta,
                        'is_active' => $template->is_active,
                    ]);

                    continue;
                }
            }

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
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
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
    public function resetTheme(Theme $theme, ?string $tenantId = null): bool
    {
        $hasPlaceholders = \App\Models\ThemePlaceholder::where('theme_id', $theme->id)->exists();

        if ($hasPlaceholders) {
            \App\Models\ThemePart::where('theme_id', $theme->id)
                ->where('tenant_id', $tenantId)
                ->delete();

            $this->ensureThemePartsExist($theme, $tenantId);

            return true;
        }

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
        $theme = $this->getActiveTheme($tenantId);

        if (!$theme) {
            return [];
        }

        // Get from page_templates table, not theme_data
        $templates = \App\Models\PageTemplate::where('theme_id', $theme->id)
            ->where('is_active', true);

        // Scope to tenant if provided
        if ($tenantId !== null) {
            $templates->where(function ($query) use ($tenantId) {
                $query->where('tenant_id', $tenantId)
                      ->orWhereNull('tenant_id');
            });
        } else {
            $templates->whereNull('tenant_id');
        }

        return $templates->get()->toArray();
    }
}

