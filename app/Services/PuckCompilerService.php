<?php

namespace App\Services;

use App\Models\Navigation;
use App\Models\Page;
use App\Models\Theme;
use App\Models\ThemePart;

class PuckCompilerService
{
    /**
     * Compile a page's Puck data with theme tokens resolved and external data embedded.
     *
     * NOTE: This ONLY compiles the page content itself.
     * Header/Footer merging happens at render time on the frontend.
     */
    public function compilePage(Page $page): array
    {
        $rawData = $page->puck_data ?? [];

        // Get active theme for the tenant
        $theme = $this->getActiveTheme($page->tenant_id);

        // Compile only the page content (header/footer handled separately)
        return $this->compileContent($rawData, $theme);
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
     * Get active theme for a tenant.
     */
    protected function getActiveTheme(?string $tenantId): ?Theme
    {
        return Theme::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->first();
    }
}
