<?php

namespace App\Services;

use App\Models\Navigation;
use App\Models\Page;
use App\Models\Theme;
use App\Models\ThemePart;
use App\Settings\TenantSettings;
use Illuminate\Support\Facades\Cache;

class PuckCompilerService
{
    /**
     * Compile a page's Puck data with metadata injection for zero-query rendering.
     *
     * This method:
     * 1. Merges header + content + footer into single JSON
     * 2. Resolves theme tokens in component props
     * 3. Embeds navigation data
     * 4. Injects global metadata (navigations, settings, theme) to eliminate runtime API calls
     *
     * The compiled JSON is stored in puck_data_compiled and served to the public,
     * allowing pages to render with zero additional database queries and zero runtime merging.
     */
    public function compilePage(Page $page): array
    {
        $rawData = $page->puck_data ?? [];

        // Get active theme for the tenant
        $theme = $this->getActiveTheme($page->tenant_id);

        // Build merged content array (header + content + footer)
        $mergedContent = [];

        // Add header content first
        if ($page->header) {
            $headerData = $page->header->puck_data_compiled ?? $page->header->puck_data_raw ?? [];
            if (isset($headerData['content']) && is_array($headerData['content'])) {
                $mergedContent = array_merge($mergedContent, $headerData['content']);
            }
        } elseif ($page->layout && $page->layout->header) {
            $headerData = $page->layout->header->puck_data_compiled ?? $page->layout->header->puck_data_raw ?? [];
            if (isset($headerData['content']) && is_array($headerData['content'])) {
                $mergedContent = array_merge($mergedContent, $headerData['content']);
            }
        }

        // Add page content
        if (isset($rawData['content']) && is_array($rawData['content'])) {
            $mergedContent = array_merge($mergedContent, $rawData['content']);
        }

        // Add footer content last
        if ($page->footer) {
            $footerData = $page->footer->puck_data_compiled ?? $page->footer->puck_data_raw ?? [];
            if (isset($footerData['content']) && is_array($footerData['content'])) {
                $mergedContent = array_merge($mergedContent, $footerData['content']);
            }
        } elseif ($page->layout && $page->layout->footer) {
            $footerData = $page->layout->footer->puck_data_compiled ?? $page->layout->footer->puck_data_raw ?? [];
            if (isset($footerData['content']) && is_array($footerData['content'])) {
                $mergedContent = array_merge($mergedContent, $footerData['content']);
            }
        }

        // Build merged data structure
        $mergedData = [
            'content' => $mergedContent,
            'root' => $rawData['root'] ?? [],
            'zones' => $rawData['zones'] ?? [],
        ];

        // Compile content with theme token resolution
        $compiledContent = $this->compileContent($mergedData, $theme);

        // Inject metadata for global data (navigations, settings, theme)
        // This eliminates the need for 3+ API calls on the frontend
        $metadata = $this->gatherMetadata($page->tenant_id);

        return array_merge($compiledContent, ['metadata' => $metadata]);
    }

    /**
     * Compile a theme part's Puck data.
     */
    public function compileThemePart(ThemePart $themePart): array
    {
        $rawData = $themePart->puck_data_raw ?? [];

        // Get active theme for the tenant
        $theme = $this->getActiveTheme($themePart->tenant_id);

        return $this->compileContent($rawData, $theme);
    }

    /**
     * Recursively walk through Puck JSON and resolve theme tokens + embed external data.
     */
    protected function compileContent(array $data, ?Theme $theme): array
    {
        if (empty($data)) {
            return $data;
        }

        // Process content array
        if (isset($data['content']) && is_array($data['content'])) {
            $data['content'] = array_map(function ($component) use ($theme) {
                return $this->compileComponent($component, $theme);
            }, $data['content']);
        }

        // Process root
        if (isset($data['root'])) {
            $data['root'] = $this->resolveProps($data['root'], $theme);
        }

        return $data;
    }

    /**
     * Compile a single component.
     */
    protected function compileComponent(array $component, ?Theme $theme): array
    {
        // Resolve props
        if (isset($component['props'])) {
            $component['props'] = $this->resolveProps($component['props'], $theme);

            // Special handling for Navigation component
            if ($component['type'] === 'Navigation' && isset($component['props']['navigationId'])) {
                $component['props'] = $this->embedNavigationData($component['props']);
            }

            // Recursively compile nested slot content
            foreach ($component['props'] as $key => $value) {
                if (is_array($value) && isset($value['content'])) {
                    $component['props'][$key] = $this->compileContent($value, $theme);
                }
            }
        }

        return $component;
    }

    /**
     * Resolve theme tokens in props.
     */
    protected function resolveProps(array $props, ?Theme $theme): array
    {
        if (!$theme) {
            return $props;
        }

        $themeData = $theme->theme_data ?? [];

        foreach ($props as $key => $value) {
            if (is_string($value)) {
                // Check if value looks like a theme token reference
                // e.g., "colors.primary.500" or starts with specific patterns
                $props[$key] = $this->resolveToken($value, $themeData);
            } elseif (is_array($value)) {
                $props[$key] = $this->resolveProps($value, $theme);
            }
        }

        return $props;
    }

    /**
     * Resolve a single token value from theme data.
     */
    protected function resolveToken(string $value, array $themeData): string
    {
        // Skip if it doesn't look like a token reference
        if (!$this->looksLikeToken($value)) {
            return $value;
        }

        $keys = explode('.', $value);
        $resolved = $themeData;

        foreach ($keys as $key) {
            if (is_array($resolved) && isset($resolved[$key])) {
                $resolved = $resolved[$key];
            } else {
                // Token not found, return original
                return $value;
            }
        }

        // If resolved value is a string, return it; otherwise return original
        return is_string($resolved) ? $resolved : $value;
    }

    /**
     * Check if a string looks like a theme token reference.
     */
    protected function looksLikeToken(string $value): bool
    {
        // Check for common token patterns
        // Examples: "colors.primary.500", "typography.fontSize.xl", "spacing.md"
        return preg_match('/^(colors|typography|spacing|borderRadius|shadows|components)\.[a-zA-Z0-9_.]+$/', $value) === 1;
    }

    /**
     * Embed navigation data into component props.
     */
    protected function embedNavigationData(array $props): array
    {
        $navigationId = $props['navigationId'] ?? null;

        if (!$navigationId) {
            return $props;
        }

        // Extract actual ID (handle Puck external field format)
        $actualId = is_array($navigationId) && isset($navigationId['value'])
            ? $navigationId['value']
            : $navigationId;

        try {
            $navigation = Navigation::where('status', 'published')->findOrFail($actualId);

            // Embed the full navigation structure
            $props['navigationData'] = [
                'id' => $navigation->id,
                'name' => $navigation->name,
                'structure' => $navigation->structure ?? [],
            ];
        } catch (\Exception $e) {
            // Navigation not found or not published, keep props as-is
            $props['navigationData'] = null;
        }

        return $props;
    }

    /**
     * Gather all global metadata for a tenant.
     *
     * This data is flushed to JSON to avoid runtime queries on the frontend.
     * Includes: navigations, site settings, and active theme data.
     *
     * Uses caching to avoid repeated queries during bulk operations.
     */
    protected function gatherMetadata(?string $tenantId): array
    {
        $cacheKey = "page_metadata_{$tenantId}";

        return Cache::remember($cacheKey, now()->addHour(), function () use ($tenantId) {
            // Get published navigations
            $navigations = Navigation::where('tenant_id', $tenantId)
                ->where('status', 'published')
                ->orderBy('sort_order')
                ->get(['id', 'name', 'slug', 'structure'])
                ->toArray();

            // Get tenant settings (site title, logo, etc.)
            $settings = null;
            try {
                $tenantSettings = app(TenantSettings::class);
                $settings = [
                    'site_title' => $tenantSettings->site_title,
                    'site_description' => $tenantSettings->site_description,
                    'logo_url' => $tenantSettings->logo_url,
                    'favicon_url' => $tenantSettings->favicon_url,
                    'social_links' => $tenantSettings->social_links,
                    'seo_meta' => $tenantSettings->seo_meta,
                ];
            } catch (\Exception $e) {
                // Settings not initialized for this tenant yet
            }

            // Get active theme data
            $theme = $this->getActiveTheme($tenantId);
            $themeData = $theme ? [
                'id' => $theme->id,
                'name' => $theme->name,
                'slug' => $theme->slug,
                'data' => $theme->theme_data,
            ] : null;

            return [
                'navigations' => $navigations,
                'settings' => $settings,
                'theme' => $themeData,
            ];
        });
    }

    /**
     * Get active theme for a tenant.
     */
    protected function getActiveTheme(?string $tenantId): ?Theme
    {
        return Theme::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->first();
    }
}
