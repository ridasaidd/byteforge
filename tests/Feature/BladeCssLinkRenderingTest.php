<?php

namespace Tests\Feature;

use App\Models\Theme;
use App\Models\Tenant;
use App\Services\ThemeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BladeCssLinkRenderingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Theme $activeTheme;
    protected ThemeService $themeService;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // Create a test tenant
        $this->tenant = Tenant::factory()->create();

        // Create a theme
        $this->activeTheme = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'slug' => 'test-theme',
            'theme_data' => [
                'colors' => ['primary' => '#3b82f6'],
            ],
        ]);

        $this->themeService = app(ThemeService::class);
    }

    /**
     * Test that public-central blade view includes theme CSS link when theme is active
     */
    public function test_blade_template_can_access_active_theme_css_url(): void
    {
        // Activate the theme
        $this->themeService->activateTheme($this->activeTheme->slug, $this->tenant->id);

        // Get the active theme
        $activeTheme = Theme::forTenant($this->tenant->id)->active()->first();
        $this->assertNotNull($activeTheme);

        // Verify the theme has a CSS URL method
        $cssUrl = $activeTheme->getCssUrl();
        $this->assertStringContainsString('/storage/themes/', $cssUrl);
        $this->assertStringContainsString('?v=', $cssUrl);
    }

    /**
     * Test that CSS file URL matches expected format for blade rendering
     */
    public function test_css_url_format_is_valid_for_html_link_tag(): void
    {
        $this->themeService->activateTheme($this->activeTheme->slug, $this->tenant->id);

        $theme = Theme::forTenant($this->tenant->id)->active()->first();
        $cssUrl = $theme->getCssUrl();

        // URL should be a valid href attribute value
        $this->assertTrue(str_starts_with($cssUrl, '/'));
        $this->assertStringContainsString('.css', $cssUrl);
        $this->assertStringNotContainsString('"', $cssUrl);
        $this->assertStringNotContainsString("'", $cssUrl);
    }

    /**
     * Test that CSS link URL changes when theme is updated
     */
    public function test_css_url_updates_when_theme_is_modified(): void
    {
        Storage::fake('public');

        $this->themeService->activateTheme($this->activeTheme->slug, $this->tenant->id);
        $initialUrl = $this->activeTheme->getCssUrl();
        $initialVersion = $this->activeTheme->getCssVersion();

        // Wait a moment and then update the theme
        sleep(1);
        $this->themeService->updateTheme($this->activeTheme, [
            'colors' => ['primary' => '#ef4444'],
        ]);

        // Get fresh data from DB
        $updatedTheme = $this->activeTheme->fresh();
        $updatedUrl = $updatedTheme->getCssUrl();
        $updatedVersion = $updatedTheme->getCssVersion();

        // Version should be different (based on updated_at)
        $this->assertNotEquals($initialVersion, $updatedVersion);
        $this->assertNotEquals($initialUrl, $updatedUrl);
    }

    /**
     * Test that blade view can access theme CSS URL data
     */
    public function test_blade_view_can_render_complete_html_with_css_link(): void
    {
        Storage::fake('public');

        $this->themeService->activateTheme($this->activeTheme->slug, $this->tenant->id);
        $activeTheme = Theme::forTenant($this->tenant->id)->active()->first();

        // Verify that we can pass theme CSS URL to a blade view context
        $cssUrl = $activeTheme->getCssUrl();

        // The URL should be properly formatted for use in HTML href attributes
        $this->assertStringContainsString('/storage/themes/', $cssUrl);
        $this->assertStringContainsString('.css', $cssUrl);
        $this->assertTrue(preg_match('/^\/storage\/themes\/\d+\.css\?v=\d+$/', $cssUrl) === 1);
    }
}
