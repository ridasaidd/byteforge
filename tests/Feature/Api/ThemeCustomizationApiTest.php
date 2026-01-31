<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\ThemePart;
use App\Models\ThemePlaceholder;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ThemeService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Passport\Passport;
use Tests\TestCase;

/**
 * Theme Customization API Tests - Simplified Architecture
 *
 * Architecture:
 * - Themes are global blueprints (is_system_theme = true, tenant_id = null)
 * - theme_placeholders store default content (edited by Theme Builder)
 * - theme_parts store scoped customizations (per tenant/central)
 * - Activation copies placeholders -> theme_parts for the scope
 * - Customization edits theme_parts, not the theme or placeholders
 */
class ThemeCustomizationApiTest extends TestCase
{
    use DatabaseTransactions;

    protected User $superadminUser;
    protected User $viewerUser;
    protected User $tenantOwnerUser;
    protected Tenant $tenantOne;
    protected Theme $theme;
    protected ThemeService $themeService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->themeService = $this->app->make(ThemeService::class);

        // Get existing central users (seeded by TestFixturesSeeder via parent::setUp)
        $this->superadminUser = User::where('email', 'superadmin@byteforge.se')->first();
        $this->viewerUser = User::where('email', 'viewer@byteforge.se')->first();

        // Get tenant fixtures
        $this->tenantOne = Tenant::where('slug', 'tenant-one')->first();
        $this->tenantOwnerUser = User::where('email', 'owner@tenant-one.byteforge.se')->first();

        // Create a theme blueprint with placeholders
        $this->theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'name' => 'Test Theme',
            'slug' => 'test-theme',
        ]);

        // Create placeholders (blueprint defaults)
        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'header',
            'content' => ['root' => ['props' => []], 'content' => [['type' => 'Header']]],
        ]);

        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'footer',
            'content' => ['root' => ['props' => []], 'content' => [['type' => 'Footer']]],
        ]);
    }

    /**
     * Test central superadmin can customize active theme (after activation creates theme_parts)
     */
    public function test_central_superadmin_can_customize_active_theme(): void
    {
        // Activate theme for central - this creates theme_parts
        $this->themeService->activateTheme('test-theme', null);

        Passport::actingAs($this->superadminUser);

        $response = $this->postJson("/api/themes/{$this->theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #ff0000; }',
            'theme_data' => [
                'colors' => ['primary' => ['500' => '#ff0000']],
            ],
        ]);

        $response->assertStatus(200);

        // CSS is now stored in theme_parts, not on the theme
        $settingsPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'settings')
            ->first();

        $this->assertNotNull($settingsPart);
        $this->assertEquals(':root { --primary-500: #ff0000; }', $settingsPart->settings_css);
        $this->assertEquals(['colors' => ['primary' => ['500' => '#ff0000']]], $settingsPart->puck_data_raw);
    }

    /**
     * Test cannot customize theme without activating first (no theme_parts)
     */
    public function test_cannot_customize_without_activation(): void
    {
        Passport::actingAs($this->superadminUser);

        // Don't activate - theme_parts don't exist yet
        $response = $this->postJson("/api/themes/{$this->theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #ff0000; }',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Please activate this theme first to customize it.',
        ]);
    }

    /**
     * Test central can customize header section
     */
    public function test_central_can_customize_header_section(): void
    {
        // Activate theme for central
        $this->themeService->activateTheme('test-theme', null);

        Passport::actingAs($this->superadminUser);

        $response = $this->postJson("/api/themes/{$this->theme->id}/customization/header", [
            'css' => '.header { background: blue; }',
            'puck_data' => ['root' => ['props' => ['background' => 'blue']], 'content' => []],
        ]);

        $response->assertStatus(200);

        // CSS is now stored in theme_parts
        $headerPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();

        $this->assertEquals('.header { background: blue; }', $headerPart->settings_css);
        $this->assertEquals('blue', $headerPart->puck_data_raw['root']['props']['background'] ?? null);
    }

    /**
     * Test central can customize footer section
     */
    public function test_central_can_customize_footer_section(): void
    {
        // Activate theme for central
        $this->themeService->activateTheme('test-theme', null);

        Passport::actingAs($this->superadminUser);

        $response = $this->postJson("/api/themes/{$this->theme->id}/customization/footer", [
            'css' => '.footer { color: green; }',
            'puck_data' => ['root' => ['props' => ['color' => 'green']], 'content' => []],
        ]);

        $response->assertStatus(200);

        // CSS is now stored in theme_parts
        $footerPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'footer')
            ->first();

        $this->assertEquals('.footer { color: green; }', $footerPart->settings_css);
        $this->assertEquals('green', $footerPart->puck_data_raw['root']['props']['color'] ?? null);
    }

    /**
     * Test cannot modify invalid sections via customization
     */
    public function test_cannot_modify_invalid_sections(): void
    {
        // Activate theme for central
        $this->themeService->activateTheme('test-theme', null);

        Passport::actingAs($this->superadminUser);

        // Try to modify 'info' section (not allowed)
        $response = $this->postJson("/api/themes/{$this->theme->id}/customization/info", [
            'css' => '.info { color: red; }',
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test get customization returns all sections
     */
    public function test_get_customization_returns_all_sections(): void
    {
        // Activate theme
        $this->themeService->activateTheme('test-theme', null);

        // Set CSS on theme_parts (where customizations are stored)
        $settingsPart = ThemePart::create([
            'theme_id' => $this->theme->id,
            'tenant_id' => null,
            'type' => 'settings',
            'name' => 'Test Settings',
            'slug' => 'test-settings',
            'settings_css' => ':root { --primary: blue; }',
            'status' => 'published',
            'created_by' => $this->superadminUser->id,
        ]);

        $headerPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();
        $headerPart->update(['settings_css' => '.header { color: red; }']);

        $footerPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'footer')
            ->first();
        $footerPart->update(['settings_css' => '.footer { color: green; }']);

        Passport::actingAs($this->superadminUser);

        $response = $this->getJson("/api/themes/{$this->theme->id}/customization");

        $response->assertStatus(200);
        $response->assertJson([
            'data' => [
                'settings_css' => ':root { --primary: blue; }',
                'header_css' => '.header { color: red; }',
                'footer_css' => '.footer { color: green; }',
            ],
        ]);
    }

    /**
     * Test central viewer cannot customize (no themes.manage permission)
     */
    public function test_central_viewer_cannot_customize(): void
    {
        // Activate theme
        $this->themeService->activateTheme('test-theme', null);

        Passport::actingAs($this->viewerUser);

        $response = $this->postJson("/api/themes/{$this->theme->id}/customization/settings", [
            'css' => ':root { --hack: red; }',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test tenant and central have isolated theme_parts
     */
    public function test_tenant_and_central_have_isolated_parts(): void
    {
        $tenantId = $this->tenantOne->id;

        // Activate for both central and tenant
        $this->themeService->activateTheme('test-theme', null);
        $this->themeService->activateTheme('test-theme', $tenantId);

        // Verify separate theme_parts exist
        $centralParts = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->count();

        $tenantParts = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $this->theme->id)
            ->count();

        $this->assertEquals(2, $centralParts); // header + footer
        $this->assertEquals(2, $tenantParts);  // header + footer

        // Modify central's header
        Passport::actingAs($this->superadminUser);

        $this->postJson("/api/themes/{$this->theme->id}/customization/header", [
            'puck_data' => ['root' => ['props' => ['title' => 'Central Header']], 'content' => []],
        ]);

        // Verify tenant's header is unchanged
        $tenantHeader = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();

        // Tenant header should still have original content from placeholder
        $this->assertArrayHasKey('type', $tenantHeader->puck_data_raw['content'][0] ?? []);
        $this->assertEquals('Header', $tenantHeader->puck_data_raw['content'][0]['type'] ?? null);
    }
}
