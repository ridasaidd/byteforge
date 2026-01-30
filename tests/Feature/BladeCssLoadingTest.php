<?php

namespace Tests\Feature;

use App\Models\Theme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 6 Step 5: Blade CSS Loading with Customization
 *
 * Tests that the Blade views correctly load:
 * 1. Base theme CSS from disk (system theme files)
 * 2. Instance customization CSS from database (overrides)
 */
class BladeCssLoadingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test: Central storefront loads customization CSS from database
     */
    public function test_central_storefront_loads_customization_css()
    {
        // Create system theme (base theme on disk)
        Theme::factory()->create([
            'id' => 1,
            'tenant_id' => null,
            'is_system_theme' => true,
        ]);

        // Create central storefront active theme (instance of system theme)
        Theme::factory()->create([
            'tenant_id' => null,
            'base_theme' => '1',
            'is_system_theme' => false,
            'is_active' => true,
            'settings_css' => ':root { --primary-500: #central-custom; }',
            'header_css' => '.header { color: #central-blue; }',
            'footer_css' => '.footer { color: #central-green; }',
        ]);

        // Create a homepage to trigger public-central view
        \App\Models\Page::factory()->create([
            'tenant_id' => null,
            'is_homepage' => true,
            'status' => 'published',
        ]);

        // Render public page
        $response = $this->get('/');

        // Should load customization CSS from database (in <style> tags)
        $response->assertSee('--primary-500: #central-custom');
        $response->assertSee('.header { color: #central-blue; }');
        $response->assertSee('.footer { color: #central-green; }');
    }

    /**
     * Test: Customization CSS has unique IDs for each section
     */
    public function test_customization_css_style_tags_have_unique_ids()
    {
        Theme::factory()->create([
            'id' => 1,
            'tenant_id' => null,
            'is_system_theme' => true,
        ]);

        Theme::factory()->create([
            'tenant_id' => null,
            'base_theme' => '1',
            'is_system_theme' => false,
            'is_active' => true,
            'settings_css' => ':root { --settings: true; }',
            'header_css' => '.header { --header: true; }',
            'footer_css' => '.footer { --footer: true; }',
        ]);

        \App\Models\Page::factory()->create([
            'tenant_id' => null,
            'is_homepage' => true,
            'status' => 'published',
        ]);

        $response = $this->get('/');

        // Each section should have a unique ID
        $response->assertSee('id="customization-settings-css"');
        $response->assertSee('id="customization-header-css"');
        $response->assertSee('id="customization-footer-css"');
    }

    /**
     * Test: Base theme CSS links are present in the view
     */
    public function test_base_theme_css_links_present()
    {
        Theme::factory()->create([
            'id' => 1,
            'tenant_id' => null,
            'is_system_theme' => true,
        ]);

        Theme::factory()->create([
            'tenant_id' => null,
            'base_theme' => '1',
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        \App\Models\Page::factory()->create([
            'tenant_id' => null,
            'is_homepage' => true,
            'status' => 'published',
        ]);

        $response = $this->get('/');

        // Base theme CSS link files should be referenced
        $response->assertSee('1_variables.css');
        $response->assertSee('1_header.css');
        $response->assertSee('1_footer.css');
    }

    /**
     * Test: Page renders without customization CSS
     */
    public function test_renders_without_customization_css()
    {
        Theme::factory()->create([
            'id' => 1,
            'tenant_id' => null,
            'is_system_theme' => true,
        ]);

        Theme::factory()->create([
            'tenant_id' => null,
            'base_theme' => '1',
            'is_system_theme' => false,
            'is_active' => true,
            'settings_css' => null,
            'header_css' => null,
            'footer_css' => null,
        ]);

        \App\Models\Page::factory()->create([
            'tenant_id' => null,
            'is_homepage' => true,
            'status' => 'published',
        ]);

        $response = $this->get('/');

        // Should render successfully
        $response->assertStatus(200);

        // Base theme links should still be present
        $response->assertSee('1_variables.css');
    }

    /**
     * Test: Page renders without active theme
     */
    public function test_renders_without_active_theme()
    {
        // No theme created at all
        $response = $this->get('/');

        // Should still render successfully
        $response->assertStatus(200);
    }

    /**
     * Test: Theme model has customization CSS columns
     */
    public function test_theme_model_has_customization_css_columns()
    {
        $theme = Theme::factory()->create([
            'settings_css' => ':root { --test: red; }',
            'header_css' => '.header { color: blue; }',
            'footer_css' => '.footer { color: green; }',
        ]);

        $this->assertEquals(':root { --test: red; }', $theme->settings_css);
        $this->assertEquals('.header { color: blue; }', $theme->header_css);
        $this->assertEquals('.footer { color: green; }', $theme->footer_css);
    }

    /**
     * Test: Theme model allows null customization CSS
     */
    public function test_theme_model_allows_null_customization_css()
    {
        $theme = Theme::factory()->create([
            'settings_css' => null,
            'header_css' => null,
            'footer_css' => null,
        ]);

        $this->assertNull($theme->settings_css);
        $this->assertNull($theme->header_css);
        $this->assertNull($theme->footer_css);
    }

    /**
     * Test: Only non-null customization CSS is rendered
     */
    public function test_only_non_null_customization_css_rendered()
    {
        Theme::factory()->create([
            'id' => 1,
            'tenant_id' => null,
            'is_system_theme' => true,
        ]);

        Theme::factory()->create([
            'tenant_id' => null,
            'base_theme' => '1',
            'is_system_theme' => false,
            'is_active' => true,
            'settings_css' => ':root { --settings-only: true; }',
            'header_css' => null,
            'footer_css' => null,
        ]);

        \App\Models\Page::factory()->create([
            'tenant_id' => null,
            'is_homepage' => true,
            'status' => 'published',
        ]);

        $response = $this->get('/');

        // Settings CSS should be rendered
        $response->assertSee('--settings-only: true');

        // Only settings style tag should be present, not header/footer
        $response->assertSee('id="customization-settings-css"');
        $response->assertDontSee('id="customization-header-css"');
        $response->assertDontSee('id="customization-footer-css"');
    }

    /**
     * Test: Page using /pages/{slug} route also loads customization CSS
     */
    public function test_pages_slug_route_loads_customization_css()
    {
        Theme::factory()->create([
            'id' => 1,
            'tenant_id' => null,
            'is_system_theme' => true,
        ]);

        Theme::factory()->create([
            'tenant_id' => null,
            'base_theme' => '1',
            'is_system_theme' => false,
            'is_active' => true,
            'settings_css' => ':root { --slug-page: true; }',
        ]);

        \App\Models\Page::factory()->create([
            'tenant_id' => null,
            'slug' => 'about',
            'status' => 'published',
        ]);

        $response = $this->get('/pages/about');

        // Customization CSS should be loaded
        $response->assertSee('--slug-page: true');
    }
}
