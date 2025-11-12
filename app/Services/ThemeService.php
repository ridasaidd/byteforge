<?php

namespace App\Services;

use App\Models\Theme;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ThemeService
{
    /**
     * Scan themes folder, sync found themes to database, and flag missing DB themes as unavailable.
     * Only runs in central app context.
     */
    public function syncThemesFromDisk(): void
    {
    $themesPath = resource_path('js/shared/themes');
        if (!File::exists($themesPath)) {
            // Directory missing: nothing to sync
            return;
        }

        $foundSlugs = [];
        $directories = File::directories($themesPath);

        foreach ($directories as $dir) {
            $themeSlug = basename($dir);
            $themeJsonPath = "$dir/theme.json";
            if (File::exists($themeJsonPath)) {
                $themeData = json_decode(File::get($themeJsonPath), true);
                $foundSlugs[] = $themeSlug;

                // Add or update theme in DB (central only: tenant_id = null)
                $theme = Theme::where('tenant_id', null)
                    ->where('slug', $themeSlug)
                    ->first();

                if (!$theme) {
                    Theme::create([
                        'tenant_id' => null,
                        'name' => $themeData['name'] ?? Str::title($themeSlug),
                        'slug' => $themeSlug,
                        'base_theme' => $themeSlug,
                        'theme_data' => $themeData,
                        'description' => $themeData['description'] ?? null,
                        'author' => $themeData['author'] ?? null,
                        'version' => $themeData['version'] ?? '1.0.0',
                        'is_active' => false,
                        'unavailable' => false,
                    ]);
                } else {
                    // Update theme fields if changed
                    $theme->name = $themeData['name'] ?? Str::title($themeSlug);
                    $theme->description = $themeData['description'] ?? null;
                    $theme->author = $themeData['author'] ?? null;
                    $theme->version = $themeData['version'] ?? '1.0.0';
                    $theme->theme_data = $themeData;
                    $theme->unavailable = false;
                    $theme->save();
                }
            }
        }

        // Flag missing DB themes as unavailable and disable 'active'
        $dbThemes = Theme::where('tenant_id', null)->get();
        foreach ($dbThemes as $theme) {
            if (!in_array($theme->slug, $foundSlugs)) {
                $theme->unavailable = true;
                $theme->is_active = false;
                $theme->save();
            }
        }
    }
    /**
     * Get all available themes from storage/themes directory.
     */
    public function getAvailableThemes(): array
    {
    $themesPath = resource_path('js/shared/themes');

        // Directory creation disabled for in-house theme management
        // if (!File::exists($themesPath)) {
        //     File::makeDirectory($themesPath, 0755, true);
        //     return [];
        // }
        if (!File::exists($themesPath)) {
            // Directory missing: return empty, do not create
            return [];
        }

        $themes = [];
        $directories = File::directories($themesPath);

        foreach ($directories as $dir) {
            $themeName = basename($dir);
            $themeJsonPath = "{$dir}/theme.json";

            if (File::exists($themeJsonPath)) {
                $themeData = json_decode(File::get($themeJsonPath), true);

                $themes[] = [
                    'slug' => $themeName,
                    'name' => $themeData['name'] ?? Str::title($themeName),
                    'description' => $themeData['description'] ?? '',
                    'author' => $themeData['author'] ?? '',
                    'version' => $themeData['version'] ?? '1.0.0',
                    'preview' => File::exists("{$dir}/preview.png") ? "shared/themes/{$themeName}/preview.png" : null,
                    'data' => $themeData,
                ];
            }
        }

        return $themes;
    }

    /**
     * Load theme data from disk.
     */
    public function loadThemeFromDisk(string $themeSlug): ?array
    {
    $themePath = resource_path("js/shared/themes/{$themeSlug}/theme.json");

        if (!File::exists($themePath)) {
            return null;
        }

        return json_decode(File::get($themePath), true);
    }

    /**
     * Activate a theme for a tenant.
     * If theme doesn't exist in DB, create it from disk first.
     */
    public function activateTheme(string $themeSlug, ?string $tenantId = null): ?Theme
    {
        // Load theme data from disk
        $themeData = $this->loadThemeFromDisk($themeSlug);

        if (!$themeData) {
            return null;
        }

        // Check if theme already exists in database for this tenant
        $theme = Theme::forTenant($tenantId)
            ->where('slug', $themeSlug)
            ->first();

        if (!$theme) {
            // Create new theme from disk
            $theme = Theme::create([
                'tenant_id' => $tenantId,
                'name' => $themeData['name'] ?? Str::title($themeSlug),
                'slug' => $themeSlug,
                'base_theme' => $themeSlug,
                'theme_data' => $themeData,
                'description' => $themeData['description'] ?? null,
                'author' => $themeData['author'] ?? null,
                'version' => $themeData['version'] ?? '1.0.0',
                'is_active' => false,
            ]);
        }

        // Activate the theme
        $theme->activate();

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
    public function getOrCreateDefaultTheme(?string $tenantId = null): Theme
    {
        $activeTheme = $this->getActiveTheme($tenantId);

        if ($activeTheme) {
            return $activeTheme;
        }

        // No active theme, activate the default one
        return $this->activateTheme('default', $tenantId)
            ?? throw new \Exception('Default theme not found in storage/themes/default');
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
        // First try to get from installed theme in database
        $theme = Theme::forTenant($tenantId)
            ->where('slug', $themeSlug)
            ->first();

        if ($theme && isset($theme->theme_data['templates'])) {
            return $theme->theme_data['templates'];
        }

        // Fallback to theme file on disk
        $themeData = $this->loadThemeFromDisk($themeSlug);

        return $themeData['templates'] ?? [];
    }

    /**
     * Get templates from active theme
     */
    public function getTemplatesFromActiveTheme(?string $tenantId = null): array
    {
        $theme = $this->getOrCreateDefaultTheme($tenantId);

        return $theme->theme_data['templates'] ?? [];
    }
}

