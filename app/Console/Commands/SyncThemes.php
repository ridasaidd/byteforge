<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SyncThemes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'themes:sync {--force : Force sync even if themes exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync themes from disk (resources/js/shared/themes) to database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🎨 Syncing themes from disk to database...');
        $this->newLine();

        $themesPath = resource_path('js/shared/themes');

        if (!is_dir($themesPath)) {
            $this->error("Themes directory not found: {$themesPath}");
            return self::FAILURE;
        }

        $themeDirs = array_filter(glob($themesPath . '/*'), 'is_dir');
        $syncedCount = 0;
        $skippedCount = 0;
        $templateCount = 0;

        foreach ($themeDirs as $themeDir) {
            $slug = basename($themeDir);
            $themeFile = $themeDir . '/theme.json';

            if (!file_exists($themeFile)) {
                $this->warn("⚠ Skipping {$slug}: theme.json not found");
                $skippedCount++;
                continue;
            }

            $themeData = json_decode(file_get_contents($themeFile), true);

            if (!$themeData) {
                $this->error("✗ Failed to parse theme.json for: {$slug}");
                $skippedCount++;
                continue;
            }

            // Check if theme already exists
            $existingTheme = DB::table('themes')
                ->where('tenant_id', null)
                ->where('slug', $slug)
                ->first();

            if ($existingTheme && !$this->option('force')) {
                $this->line("⊙ Theme exists: {$slug} (use --force to update)");
                $skippedCount++;
                continue;
            }

            // Extract templates if they exist
            $templates = $themeData['templates'] ?? [];
            unset($themeData['templates']);

            // Insert or update theme
            DB::table('themes')->updateOrInsert(
                [
                    'tenant_id' => null,
                    'slug' => $slug,
                ],
                [
                    'name' => $themeData['name'] ?? Str::title($slug),
                    'base_theme' => $slug,
                    'theme_data' => json_encode($themeData),
                    'is_active' => $existingTheme ? $existingTheme->is_active : ($slug === 'modern'),
                    'unavailable' => false,
                    'description' => $themeData['description'] ?? null,
                    'author' => $themeData['author'] ?? 'ByteForge',
                    'version' => $themeData['version'] ?? '1.0.0',
                    'updated_at' => now(),
                    'created_at' => $existingTheme->created_at ?? now(),
                ]
            );

            // Get theme ID
            $theme = DB::table('themes')
                ->where('tenant_id', null)
                ->where('slug', $slug)
                ->first();

            $this->info("✓ Synced: {$themeData['name']} ({$slug})");
            $syncedCount++;

            // Sync templates
            if (!empty($templates) && $theme) {
                $templatesAdded = $this->syncTemplates($templates, $theme->id, $slug);
                $templateCount += $templatesAdded;
            }
        }

        $this->newLine();
        $this->info("✓ Sync complete!");
        $this->line("  Themes synced: {$syncedCount}");
        $this->line("  Themes skipped: {$skippedCount}");
        $this->line("  Templates synced: {$templateCount}");

        return self::SUCCESS;
    }

    /**
     * Sync page templates from a theme
     */
    private function syncTemplates(array $templates, int $themeId, string $themeSlug): int
    {
        $count = 0;

        foreach ($templates as $template) {
            if (!isset($template['slug']) || !isset($template['puckData'])) {
                continue;
            }

            $category = $this->determineCategoryFromSlug($template['slug']);

            DB::table('page_templates')->updateOrInsert(
                [
                    'slug' => "{$themeSlug}-{$template['slug']}",
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
                    'updated_at' => now(),
                    'created_at' => DB::table('page_templates')
                        ->where('slug', "{$themeSlug}-{$template['slug']}")
                        ->value('created_at') ?? now(),
                ]
            );

            $this->line("  → Template: {$template['name']}");
            $count++;
        }

        return $count;
    }

    private function determineCategoryFromSlug(string $slug): string
    {
        $categories = [
            'homepage|home' => 'landing',
            'about' => 'about',
            'contact' => 'contact',
            'blog' => 'blog',
            'portfolio' => 'portfolio',
            'service' => 'business',
            'product' => 'ecommerce',
        ];

        foreach ($categories as $pattern => $category) {
            if (preg_match("/{$pattern}/i", $slug)) {
                return $category;
            }
        }

        return 'general';
    }
}
