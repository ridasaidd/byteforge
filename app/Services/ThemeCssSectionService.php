<?php

namespace App\Services;

use App\Models\Theme;
use Illuminate\Support\Facades\Storage;

class ThemeCssSectionService
{
    private const THEME_STORAGE_PATH = 'public/themes';

    /**
     * Initialize the theme folder in storage
     */
    public function initializeThemeFolder(Theme $theme): void
    {
        $path = $this->getThemeFolderPath($theme->id);
        Storage::disk('public')->makeDirectory($path);
    }

    /**
     * Save CSS for a specific section
     */
    public function saveSectionCss(int $themeId, string $section, string $css): void
    {
        $path = $this->getSectionFilePath($themeId, $section);
        Storage::disk('public')->put($path, $css);
    }

    /**
     * Get CSS for a specific section
     */
    public function getSectionCss(int $themeId, string $section): ?string
    {
        $path = $this->getSectionFilePath($themeId, $section);

        if (!Storage::disk('public')->exists($path)) {
            return null;
        }

        return Storage::disk('public')->get($path);
    }

    /**
     * Check if a section file exists
     */
    public function sectionExists(int $themeId, string $section): bool
    {
        $path = $this->getSectionFilePath($themeId, $section);
        return Storage::disk('public')->exists($path);
    }

    /**
     * Get list of required sections for publishing
     */
    public function getRequiredSections(): array
    {
        return ['variables', 'header', 'footer'];
    }

    /**
     * Get all section files for a theme
     */
    public function getAllSectionFiles(int $themeId): array
    {
        $folderPath = $this->getThemeFolderPath($themeId);

        if (!Storage::disk('public')->exists($folderPath)) {
            return [];
        }

        $files = Storage::disk('public')->files($folderPath);

        // Filter to only section files (*.css), return just filenames
        return array_filter(
            array_map(fn($file) => basename($file), $files),
            fn($file) => preg_match("/^{$themeId}_.*\.css$/", $file)
        );
    }

    /**
     * Delete all section files for a theme
     */
    public function deleteAllSectionFiles(int $themeId): void
    {
        $folderPath = $this->getThemeFolderPath($themeId);

        $files = $this->getAllSectionFiles($themeId);

        foreach ($files as $file) {
            $path = "{$folderPath}/{$file}";
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Delete the entire theme folder
     */
    public function deleteThemeFolder(int $themeId): void
    {
        $folderPath = $this->getThemeFolderPath($themeId);
        Storage::disk('public')->deleteDirectory($folderPath);
    }

    /**
     * Get the full path to theme folder
     */
    private function getThemeFolderPath(int $themeId): string
    {
        return "themes/{$themeId}";
    }

    /**
     * Get the full path to a section CSS file
     */
    private function getSectionFilePath(int $themeId, string $section): string
    {
        return "{$this->getThemeFolderPath($themeId)}/{$themeId}_{$section}.css";
    }
}
