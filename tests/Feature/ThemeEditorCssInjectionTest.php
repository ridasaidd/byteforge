<?php

namespace Tests\Feature;

use App\Models\Theme;
use App\Models\Tenant;
use App\Services\ThemeCssGeneratorService;
use App\Services\ThemeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ThemeEditorCssInjectionTest extends TestCase
{
    use RefreshDatabase;

    protected Theme $theme;
    protected Tenant $tenant;
    protected ThemeService $themeService;
    protected ThemeCssGeneratorService $cssGenerator;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a test tenant
        $this->tenant = Tenant::factory()->create();

        // Create a theme with sample data
        $this->theme = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'slug' => 'editor-test-theme',
            'is_active' => false,
            'theme_data' => [
                'colors' => [
                    'primary' => '#3b82f6',
                    'secondary' => '#10b981',
                    'accent' => '#f59e0b',
                ],
                'typography' => [
                    'fontFamily' => [
                        'body' => 'Inter, sans-serif',
                        'heading' => 'Playfair Display, serif',
                    ],
                    'fontSize' => [
                        'base' => '1rem',
                        'lg' => '1.125rem',
                        'xl' => '1.25rem',
                    ],
                ],
                'spacing' => [
                    '4' => '1rem',
                    '8' => '2rem',
                    '12' => '3rem',
                ],
            ],
        ]);

        $this->themeService = app(ThemeService::class);
        $this->cssGenerator = app(ThemeCssGeneratorService::class);
    }

    /**
     * Test that theme CSS is generated and accessible for editor preview
     */
    public function test_theme_css_is_generated_for_editor_preview(): void
    {
        Storage::fake('public');

        // Activate theme
        $activatedTheme = $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Verify CSS file exists
        Storage::disk('public')->assertExists("themes/{$activatedTheme->id}.css");

        // Verify CSS contains variables needed by editor components
        $css = Storage::disk('public')->get("themes/{$activatedTheme->id}.css");

        // Color variables for components
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css);
        $this->assertStringContainsString('--color-secondary: #10b981;', $css);
        $this->assertStringContainsString('--color-accent: #f59e0b;', $css);

        // Typography variables
        $this->assertStringContainsString('--font-family-body: Inter, sans-serif;', $css);
        $this->assertStringContainsString('--font-family-heading: Playfair Display, serif;', $css);

        // Spacing variables
        $this->assertStringContainsString('--spacing-4: 1rem;', $css);
        $this->assertStringContainsString('--spacing-8: 2rem;', $css);
    }

    /**
     * Test that editor can access active theme with CSS URL
     */
    public function test_editor_can_access_active_theme_with_css_url(): void
    {
        Storage::fake('public');

        // Activate theme
        $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Get active theme (as editor would)
        $activeTheme = Theme::forTenant($this->tenant->id)->active()->first();

        $this->assertNotNull($activeTheme);

        // Editor should be able to get CSS URL
        $cssUrl = $activeTheme->getCssUrl();
        $this->assertStringContainsString('/storage/themes/', $cssUrl);
        $this->assertStringContainsString('?v=', $cssUrl);

        // CSS file should exist
        Storage::disk('public')->assertExists("themes/{$activeTheme->id}.css");
    }

    /**
     * Test that CSS is regenerated when theme is updated in editor
     */
    public function test_css_regenerates_when_theme_updated_in_editor(): void
    {
        Storage::fake('public');

        // Activate theme
        $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Simulate editor updating theme colors
        $updatedTheme = $this->themeService->updateTheme($this->theme, [
            'colors' => [
                'primary' => '#ef4444', // Changed from #3b82f6
                'secondary' => '#8b5cf6', // Changed from #10b981
            ],
        ]);

        // Verify CSS was regenerated with new values
        $css = Storage::disk('public')->get("themes/{$updatedTheme->id}.css");
        $this->assertStringContainsString('--color-primary: #ef4444;', $css);
        $this->assertStringContainsString('--color-secondary: #8b5cf6;', $css);

        // Old values should not exist
        $this->assertStringNotContainsString('--color-primary: #3b82f6;', $css);
        $this->assertStringNotContainsString('--color-secondary: #10b981;', $css);
    }

    /**
     * Test that theme CSS URL is available in theme API response for editor
     */
    public function test_theme_css_url_available_in_api_response(): void
    {
        Storage::fake('public');

        // Activate theme
        $activatedTheme = $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Simulate fetching theme data as editor would via API
        $theme = Theme::find($activatedTheme->id);

        // Theme should have CSS URL and version methods
        $cssUrl = $theme->getCssUrl();
        $cssVersion = $theme->getCssVersion();

        $this->assertNotEmpty($cssUrl);
        $this->assertNotEmpty($cssVersion);
        $this->assertIsString($cssUrl);
        $this->assertIsString($cssVersion);

        // URL should match expected format
        $expectedPattern = "/^\/storage\/themes\/\d+\.css\?v=\d+$/";
        $this->assertTrue(preg_match($expectedPattern, $cssUrl) === 1);
    }

    /**
     * Test that multiple theme switches in editor maintain correct CSS state
     */
    public function test_editor_theme_switching_maintains_correct_css(): void
    {
        Storage::fake('public');

        // Create second theme
        $theme2 = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'slug' => 'editor-theme-two',
            'theme_data' => [
                'colors' => [
                    'primary' => '#8b5cf6',
                    'secondary' => '#ec4899',
                ],
            ],
        ]);

        // Activate first theme
        $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        $css1 = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css1);

        // Switch to second theme (as editor would)
        $this->themeService->activateTheme($theme2->slug, $this->tenant->id);

        $css2 = Storage::disk('public')->get("themes/{$theme2->id}.css");
        $this->assertStringContainsString('--color-primary: #8b5cf6;', $css2);
        $this->assertStringContainsString('--color-secondary: #ec4899;', $css2);

        // Both CSS files should exist independently
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");
        Storage::disk('public')->assertExists("themes/{$theme2->id}.css");

        // First theme CSS should be unchanged
        $css1Check = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css1Check);
    }

    /**
     * Test that CSS variables can be used in Puck component styles
     */
    public function test_css_variables_ready_for_puck_components(): void
    {
        Storage::fake('public');

        // Activate theme with comprehensive data
        $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Get CSS content
        $css = Storage::disk('public')->get("themes/{$this->theme->id}.css");

        // Verify CSS is wrapped in :root for global availability
        $this->assertStringContainsString(':root {', $css);

        // Verify all variable types are present for component usage
        $requiredVariables = [
            '--color-primary:',
            '--color-secondary:',
            '--font-family-body:',
            '--font-family-heading:',
            '--font-size-base:',
            '--spacing-4:',
        ];

        foreach ($requiredVariables as $variable) {
            $this->assertStringContainsString($variable, $css);
        }
    }

    /**
     * Test that theme CSS version changes when theme is updated (cache invalidation)
     */
    public function test_css_version_changes_on_theme_update_for_cache_invalidation(): void
    {
        Storage::fake('public');

        // Activate theme
        $activatedTheme = $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);
        $initialVersion = $activatedTheme->getCssVersion();
        $initialUrl = $activatedTheme->getCssUrl();

        // Wait a moment to ensure timestamp changes
        sleep(1);

        // Update theme (simulating editor changes)
        $updatedTheme = $this->themeService->updateTheme($activatedTheme->fresh(), [
            'colors' => ['primary' => '#991b1b'],
        ]);

        $newVersion = $updatedTheme->getCssVersion();
        $newUrl = $updatedTheme->getCssUrl();

        // Version should have changed
        $this->assertNotEquals($initialVersion, $newVersion);

        // URL should have different version parameter
        $this->assertNotEquals($initialUrl, $newUrl);

        // Both should still be valid URLs
        $this->assertStringContainsString('?v=', $initialUrl);
        $this->assertStringContainsString('?v=', $newUrl);
    }
}
