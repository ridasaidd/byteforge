<?php

namespace App\Services;

use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

class ThemeCssGeneratorService
{
    protected Filesystem $filesystem;

    public function __construct(Filesystem $filesystem)
    {
        $this->filesystem = $filesystem;
    }

    /**
     * Generate CSS variables from theme data
     *
     * @param array|null $themeData The theme data array
     * @return string The generated CSS with variables
     */
    public function generateCss(?array $themeData): string
    {
        $variables = [];

        if (!empty($themeData)) {
            $variables = $this->flattenArray($themeData);
        }

        return $this->buildCss($variables);
    }

    /**
     * Flatten a nested array and convert to CSS variables
     *
     * @param array $data The nested array to flatten
     * @param string $prefix The prefix for CSS variable names
     * @param array $result The accumulator for flattened variables
     * @return array
     */
    protected function flattenArray(array $data, string $prefix = '', array &$result = []): array
    {
        foreach ($data as $key => $value) {
            // Transform key names to CSS-friendly versions
            $transformedKey = $this->transformKeyName($key);

            // Special handling for typography: skip the "typography" prefix entirely
            if ($key === 'typography' && is_array($value)) {
                $this->flattenArray($value, '', $result);
                continue;
            }

            // Build the CSS variable prefix
            $variablePrefix = $prefix ? $prefix . '-' . $transformedKey : $transformedKey;

            if (is_array($value)) {
                // Recursively flatten nested arrays
                $this->flattenArray($value, $variablePrefix, $result);
            } else {
                // Add the variable to the result
                $cssVariableName = '--' . $variablePrefix;
                $result[$cssVariableName] = $value;
            }
        }

        return $result;
    }

    /**
     * Transform key names to CSS-friendly format
     * Examples:
     * - colors -> color
     * - typography -> font (for fontFamily, fontSize, etc.)
     * - shadows -> shadow
     * - fontFamily -> font-family
     * - fontSize -> font-size
     * - letterSpacing -> letter-spacing
     * - borderRadius -> border-radius
     * - backgroundColor -> background-color
     *
     * @param string $key The key to transform
     * @return string
     */
    protected function transformKeyName(string $key): string
    {
        // Map of key transformations
        $keyMap = [
            'colors' => 'color',
            'shadows' => 'shadow',
            'radius' => 'radius',
            'spacing' => 'spacing',
            'typography' => 'typography',
            'fontFamily' => 'font-family',
            'fontSize' => 'font-size',
            'fontWeight' => 'font-weight',
            'lineHeight' => 'line-height',
            'letterSpacing' => 'letter-spacing',
            'borderRadius' => 'border-radius',
            'backgroundColor' => 'background-color',
            'textColor' => 'text-color',
            'components' => 'component',
            'variants' => 'variant',
        ];

        // If the key exists in our map, use the mapped value
        if (isset($keyMap[$key])) {
            return $keyMap[$key];
        }

        // Convert camelCase to kebab-case for other keys
        return strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $key));
    }

    /**
     * Build the CSS string from variables
     *
     * @param array $variables The flattened variables
     * @return string
     */
    protected function buildCss(array $variables): string
    {
        $css = ":root {\n";

        foreach ($variables as $name => $value) {
            $css .= "    " . $name . ": " . $value . ";\n";
        }

        $css .= "}";

        return $css;
    }

    /**
     * Get the public URL for the generated CSS file
     *
     * @param int $themeId The theme ID
     * @param string $version The version string (for cache busting)
     * @return string The public URL
     */
    public function getCssUrl(int $themeId, string $version): string
    {
        return "/storage/themes/{$themeId}.css?v={$version}";
    }

    /**
     * Generate a version string for cache-busting
     * Uses the current timestamp
     *
     * @return string
     */
    public function getCssVersion(): string
    {
        return (string) time();
    }

    /**
     * Write generated CSS to storage
     *
     * @param int $themeId The theme ID
     * @param string $css The CSS content to write
     * @return bool
     */
    public function writeCssFile(int $themeId, string $css): bool
    {
        try {
            Storage::disk('public')->put("themes/{$themeId}.css", $css);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Delete generated CSS file
     *
     * @param int $themeId The theme ID
     * @return bool
     */
    public function deleteCssFile(int $themeId): bool
    {
        try {
            Storage::disk('public')->delete("themes/{$themeId}.css");
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
