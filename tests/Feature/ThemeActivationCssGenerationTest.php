<?php

namespace Tests\Feature;

use App\Models\Theme;
use App\Models\Tenant;
use App\Services\ThemeCssGeneratorService;
use App\Services\ThemeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ThemeActivationCssGenerationTest extends TestCase
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
            'slug' => 'test-theme',
            'is_active' => false,
            'theme_data' => [
                'colors' => [
                    'primary' => '#3b82f6',
                    'secondary' => '#10b981',
                ],
                'typography' => [
                    'fontFamily' => [
                        'body' => 'Inter, sans-serif',
                    ],
                ],
            ],
        ]);

        $this->themeService = app(ThemeService::class);
        $this->cssGenerator = app(ThemeCssGeneratorService::class);
    }

    /**
     * Test that CSS file is generated when theme is activated
     */
    public function test_css_file_is_generated_when_theme_is_activated(): void
    {
        Storage::fake('public');

        // Activate theme
        $activatedTheme = $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Assert theme was activated
        $this->assertTrue($activatedTheme->is_active);

        // Assert CSS file was created
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");

        // Verify CSS content
        $css = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css);
    }

    /**
     * Test that CSS file is regenerated when theme data is updated
     */
    public function test_css_file_is_regenerated_when_theme_data_is_updated(): void
    {
        Storage::fake('public');

        // First activation and verify initial CSS
        $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");

        $initialCss = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $initialCss);

        // Update theme data
        $updatedTheme = $this->themeService->updateTheme($this->theme, [
            'colors' => [
                'primary' => '#ef4444', // Changed
            ],
        ]);

        // Verify CSS was regenerated
        $updatedCss = Storage::disk('public')->get("themes/{$updatedTheme->id}.css");
        $this->assertStringContainsString('--color-primary: #ef4444;', $updatedCss);
        $this->assertStringNotContainsString('--color-primary: #3b82f6;', $updatedCss);
    }

    /**
     * Test that Theme model has getCssUrl() method
     */
    public function test_theme_model_has_get_css_url_method(): void
    {
        $url = $this->theme->getCssUrl();

        $this->assertStringContainsString('/storage/themes/' . $this->theme->id . '.css', $url);
        $this->assertStringContainsString('v=', $url); // Should have cache-busting version
    }

    /**
     * Test that Theme model has getCssVersion() method
     */
    public function test_theme_model_has_get_css_version_method(): void
    {
        $version = $this->theme->getCssVersion();

        // Version should be based on updated_at timestamp
        $this->assertIsString($version);
        $this->assertNotEmpty($version);

        // Verify it's numeric (timestamp)
        $this->assertTrue(is_numeric($version));
    }

    /**
     * Test that CSS URL with version can be used in a blade template context
     */
    public function test_css_url_with_version_can_be_rendered_in_blade(): void
    {
        $this->theme->activate();

        $url = $this->theme->getCssUrl();
        $version = $this->theme->getCssVersion();

        // Verify URL format is correct
        $expectedUrl = "/storage/themes/{$this->theme->id}.css?v={$version}";
        $this->assertEquals($expectedUrl, $url);
    }

    /**
     * Test that activated theme provides correct CSS URL for blade rendering
     */
    public function test_activated_theme_provides_css_url_for_views(): void
    {
        Storage::fake('public');

        // Activate theme
        $activatedTheme = $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);

        // Get active theme for tenant
        $activeTheme = Theme::forTenant($this->tenant->id)->active()->first();
        $this->assertNotNull($activeTheme);

        // Verify CSS URL can be used in view
        $cssUrl = $activeTheme->getCssUrl();
        $this->assertStringContainsString('/storage/themes/', $cssUrl);

        // Verify CSS file exists
        Storage::disk('public')->assertExists("themes/{$activeTheme->id}.css");
    }

    /**
     * Test that multiple theme activations and updates maintain correct CSS state
     */
    public function test_theme_css_state_is_consistent_across_multiple_operations(): void
    {
        Storage::fake('public');

        // Create second theme
        $theme2 = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'slug' => 'theme-two',
            'theme_data' => [
                'colors' => ['primary' => '#8b5cf6'],
            ],
        ]);

        // Activate first theme
        $this->themeService->activateTheme($this->theme->slug, $this->tenant->id);
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");
        $css1 = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css1);

        // Activate second theme
        $this->themeService->activateTheme($theme2->slug, $this->tenant->id);
        Storage::disk('public')->assertExists("themes/{$theme2->id}.css");
        $css2 = Storage::disk('public')->get("themes/{$theme2->id}.css");
        $this->assertStringContainsString('--color-primary: #8b5cf6;', $css2);

        // First theme CSS should still exist and be unchanged
        $css1Check = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css1Check);

        // Both themes should have correct activation state
        $this->assertTrue($theme2->fresh()->is_active);
        $this->assertFalse($this->theme->fresh()->is_active);
    }
}
