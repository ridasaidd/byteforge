<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Storage;

class ThemeCssPublishService
{
    public function __construct(private ThemeCssSectionService $sectionService)
    {
    }

    /**
     * Validate that all required sections exist
     * Returns array of missing section names, empty array if all present
     */
    public function validateRequiredSections(int $themeId): array
    {
        $required = $this->sectionService->getRequiredSections();
        $missing = [];

        foreach ($required as $section) {
            if (!$this->sectionService->sectionExists($themeId, $section)) {
                $missing[] = $section;
            }
        }

        return $missing;
    }

    /**
     * Merge all section files into a single CSS string
     * Order: variables → header → footer → templates
     */
    public function mergeAllSections(int $themeId): string
    {
        $merged = '';
        $required = $this->sectionService->getRequiredSections();

        // Merge required sections in order
        foreach ($required as $section) {
            if ($this->sectionService->sectionExists($themeId, $section)) {
                $css = $this->sectionService->getSectionCss($themeId, $section);
                if ($css) {
                    $merged .= $css . "\n\n";
                }
            }
        }

        // Merge template files (in natural order)
        $allFiles = $this->sectionService->getAllSectionFiles($themeId);
        $templateFiles = array_filter($allFiles, fn($file) => str_contains($file, 'template-'));

        // Sort template files for consistency
        sort($templateFiles);

        foreach ($templateFiles as $file) {
            $section = str_replace(["{$themeId}_", '.css'], '', $file);
            $css = $this->sectionService->getSectionCss($themeId, $section);
            if ($css) {
                $merged .= $css . "\n\n";
            }
        }

        return trim($merged);
    }

    /**
     * Publish theme: validate sections, merge, write to master file
     * Returns public URL with cache-busting version
     */
    public function publishTheme(int $themeId): string
    {
        // Validate required sections exist
        $missing = $this->validateRequiredSections($themeId);

        if (!empty($missing)) {
            throw new Exception(
                'Missing required sections: ' . implode(', ', $missing)
            );
        }

        // Merge all sections
        $mergedCss = $this->mergeAllSections($themeId);

        // Write to master CSS file
        $masterPath = "themes/{$themeId}/{$themeId}.css";
        Storage::disk('public')->put($masterPath, $mergedCss);

        // Return URL with cache-busting version
        $version = now()->timestamp;

        return "/storage/themes/{$themeId}/{$themeId}.css?v={$version}";
    }
}
