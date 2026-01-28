<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\ThemePart;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

class ThemeCustomizationApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $centralUser;
    protected User $tenantUser;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);

        // Create central user (superadmin type, no tenant)
        $this->centralUser = User::factory()->create([
            'email' => 'central@test.com',
            'type' => 'superadmin',
        ]);

        // Create tenant and tenant user
        $this->tenant = Tenant::factory()->create();
        $this->tenantUser = User::factory()->create([
            'email' => 'tenant@test.com',
            'type' => 'tenant_user',
        ]);

        // Create membership to link user to tenant
        \App\Models\Membership::create([
            'user_id' => $this->tenantUser->id,
            'tenant_id' => $this->tenant->id,
            'role' => 'owner',
        ]);
    }

    /**
     * Phase 6 Step 2: Test central can customize active theme
     */
    public function test_central_can_customize_active_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        Passport::actingAs($this->centralUser);

        $response = $this->postJson("/api/superadmin/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #ff0000; }',
            'theme_data' => [
                'colors' => ['primary' => ['500' => '#ff0000']],
            ],
        ]);

        $response->assertStatus(200);

        $theme->refresh();
        $this->assertEquals(':root { --primary-500: #ff0000; }', $theme->settings_css);
    }

    /**
     * Phase 6 Step 2: Test tenant can customize active theme
     */
    public function test_tenant_can_customize_active_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        // Authenticate BEFORE tenant context initialization
        Passport::actingAs($this->tenantUser);

        // Initialize tenant context
        tenancy()->initialize($this->tenant);
        $domain = 'tenant-customize.test';
        $this->tenant->domains()->create(['domain' => $domain]);

        $response = $this->postJson("https://{$domain}/api/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #0000ff; }',
            'theme_data' => [
                'colors' => ['primary' => ['500' => '#0000ff']],
            ],
        ]);

        if ($response->status() !== 200) {
            dump($response->json());
        }

        $response->assertStatus(200);

        $theme->refresh();
        $this->assertEquals(':root { --primary-500: #0000ff; }', $theme->settings_css);
    }

    /**
     * Phase 6 Step 2: Test cannot customize system theme
     */
    public function test_cannot_customize_system_theme(): void
    {
        $systemTheme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => true,
        ]);

        Passport::actingAs($this->centralUser);

        $response = $this->postJson("/api/superadmin/themes/{$systemTheme->id}/customization/settings", [
            'css' => ':root { --custom: red; }',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'System themes cannot be customized',
        ]);
    }

    /**
     * Phase 6 Step 2: Test central can customize header section
     */
    public function test_central_can_customize_header_section(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        // Create header theme part
        $headerPart = ThemePart::factory()->create([
            'theme_id' => $theme->id,
            'tenant_id' => null,
            'type' => 'header',
            'puck_data_raw' => ['root' => ['props' => []], 'content' => []],
        ]);

        Passport::actingAs($this->centralUser);

        $response = $this->postJson("/api/superadmin/themes/{$theme->id}/customization/header", [
            'css' => '.header { background: blue; }',
            'puck_data' => ['root' => ['props' => ['background' => 'blue']], 'content' => []],
        ]);

        $response->assertStatus(200);

        $theme->refresh();
        $this->assertEquals('.header { background: blue; }', $theme->header_css);

        // Verify puck_data was updated in theme_parts
        $headerPart->refresh();
        $this->assertEquals('blue', $headerPart->puck_data_raw['root']['props']['background'] ?? null);
    }

    /**
     * Phase 6 Step 2: Test central can customize footer section
     */
    public function test_central_can_customize_footer_section(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        // Create footer theme part
        $footerPart = ThemePart::factory()->create([
            'theme_id' => $theme->id,
            'tenant_id' => null,
            'type' => 'footer',
            'puck_data_raw' => ['root' => ['props' => []], 'content' => []],
        ]);

        Passport::actingAs($this->centralUser);

        $response = $this->postJson("/api/superadmin/themes/{$theme->id}/customization/footer", [
            'css' => '.footer { color: green; }',
            'puck_data' => ['root' => ['props' => ['color' => 'green']], 'content' => []],
        ]);

        $response->assertStatus(200);

        $theme->refresh();
        $this->assertEquals('.footer { color: green; }', $theme->footer_css);

        // Verify puck_data was updated in theme_parts
        $footerPart->refresh();
        $this->assertEquals('green', $footerPart->puck_data_raw['root']['props']['color'] ?? null);
    }

    /**
     * Phase 6 Step 2: Test cannot modify invalid sections via customization
     */
    public function test_cannot_modify_invalid_sections(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        Passport::actingAs($this->centralUser);

        // Try to modify 'info' section (not allowed)
        $response = $this->postJson("/api/superadmin/themes/{$theme->id}/customization/info", [
            'css' => '.info { color: red; }',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('section');
    }

    /**
     * Phase 6 Step 2: Test user can only customize their own tenant's theme
     */
    public function test_user_cannot_customize_other_tenant_theme(): void
    {
        $otherTenant = Tenant::factory()->create();
        $otherTheme = Theme::factory()->create([
            'tenant_id' => $otherTenant->id,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        // Authenticate BEFORE tenant context initialization
        Passport::actingAs($this->tenantUser);

        // Initialize with user's tenant (not the other tenant)
        tenancy()->initialize($this->tenant);
        $domain = 'tenant-cross-access.test';
        $this->tenant->domains()->create(['domain' => $domain]);

        $response = $this->postJson("https://{$domain}/api/themes/{$otherTheme->id}/customization/settings", [
            'css' => ':root { --hack: red; }',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Phase 6 Step 2: Test get customization returns all sections
     */
    public function test_get_customization_returns_all_sections(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
            'settings_css' => ':root { --primary: blue; }',
            'header_css' => '.header { color: red; }',
            'footer_css' => '.footer { color: green; }',
        ]);

        Passport::actingAs($this->centralUser);

        $response = $this->getJson("/api/superadmin/themes/{$theme->id}/customization");

        $response->assertStatus(200);
        $response->assertJson([
            'data' => [
                'settings_css' => ':root { --primary: blue; }',
                'header_css' => '.header { color: red; }',
                'footer_css' => '.footer { color: green; }',
            ],
        ]);
    }
}
