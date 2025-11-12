<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ThemeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This seeder reads theme.json files from resources/js/shared/themes/
     * and populates both the themes and page_templates tables.
     */
    public function run(): void
    {
        $themesPath = resource_path('js/shared/themes');

        if (!is_dir($themesPath)) {
            $this->command->error("Themes directory not found: {$themesPath}");
            return;
        }

        $themeDirs = array_filter(glob($themesPath . '/*'), 'is_dir');

        foreach ($themeDirs as $themeDir) {
            $slug = basename($themeDir);
            $themeFile = $themeDir . '/theme.json';

            if (!file_exists($themeFile)) {
                $this->command->warn("Skipping {$slug}: theme.json not found");
                continue;
            }

            $themeData = json_decode(file_get_contents($themeFile), true);

            if (!$themeData) {
                $this->command->error("Failed to parse theme.json for: {$slug}");
                continue;
            }

            // Extract templates if they exist (we'll store them separately)
            $templates = $themeData['templates'] ?? [];
            unset($themeData['templates']); // Remove from theme_data

            // Insert or update theme
            $themeId = DB::table('themes')->updateOrInsert(
                [
                    'tenant_id' => null, // NULL = global/central theme
                    'slug' => $slug,
                ],
                [
                    'name' => $themeData['name'] ?? Str::title($slug),
                    'base_theme' => $slug, // Reference to disk folder
                    'theme_data' => json_encode($themeData),
                    'is_active' => $slug === 'modern', // Make 'modern' active by default
                    'unavailable' => false,
                    'description' => $themeData['description'] ?? null,
                    'author' => $themeData['author'] ?? 'ByteForge',
                    'version' => $themeData['version'] ?? '1.0.0',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Get the theme ID for template association
            if (!is_numeric($themeId)) {
                $theme = DB::table('themes')
                    ->where('tenant_id', null)
                    ->where('slug', $slug)
                    ->first();
                $themeId = $theme->id ?? null;
            }

            $this->command->info("✓ Imported theme: {$themeData['name']} ({$slug})");

            // Insert templates if they exist
            if (!empty($templates) && $themeId) {
                $this->seedTemplates($templates, $themeId, $slug);
            }
        }

        $this->command->info("\n✓ Theme seeding completed!");
    }

    /**
     * Seed page templates from a theme's template array
     */
    private function seedTemplates(array $templates, int $themeId, string $themeSlug): void
    {
        foreach ($templates as $template) {
            if (!isset($template['slug']) || !isset($template['puckData'])) {
                $this->command->warn("  Skipping invalid template in {$themeSlug}");
                continue;
            }

            // Determine category from slug or default to theme slug
            $category = $this->determineCategoryFromSlug($template['slug']);

            DB::table('page_templates')->updateOrInsert(
                [
                    'slug' => "{$themeSlug}-{$template['slug']}", // Prefix with theme to avoid conflicts
                ],
                [
                    'name' => $template['name'] ?? Str::title($template['slug']),
                    'description' => $template['description'] ?? null,
                    'category' => $category,
                    'preview_image' => $template['preview'] ?? null,
                    'puck_data' => json_encode($template['puckData']),
                    'meta' => json_encode([
                        'theme_id' => $themeId,
                        'theme_slug' => $themeSlug,
                        'author' => $template['author'] ?? 'ByteForge',
                    ]),
                    'is_active' => true,
                    'usage_count' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $this->command->info("  ✓ Template: {$template['name']}");
        }
    }

    /**
     * Determine template category from slug
     */
    private function determineCategoryFromSlug(string $slug): string
    {
        if (str_contains($slug, 'homepage') || str_contains($slug, 'home')) {
            return 'landing';
        } elseif (str_contains($slug, 'about')) {
            return 'about';
        } elseif (str_contains($slug, 'contact')) {
            return 'contact';
        } elseif (str_contains($slug, 'blog')) {
            return 'blog';
        } elseif (str_contains($slug, 'portfolio')) {
            return 'portfolio';
        } elseif (str_contains($slug, 'service')) {
            return 'business';
        } elseif (str_contains($slug, 'product')) {
            return 'ecommerce';
        }

        return 'general';
    }
}
