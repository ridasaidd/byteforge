<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\ThemePart;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

/**
 * Phase 6 Step 2: Theme Customization API Tests
 *
 * Uses existing test fixtures from TestFixturesSeeder:
 * - Tenants: tenant-one, tenant-two, tenant-three
 * - Users: superadmin, editor, manager, viewer (central)
 *         user.tenant-one, user.tenant-two, user.tenant-three (tenant-specific)
 *
 * Tests authorization with various role/permission combinations
 */
class ThemeCustomizationApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadminUser;
    protected User $editorUser;
    protected User $viewerUser;
    protected User $tenantOwnerUser;
    protected User $tenantEditorUser;
    protected User $tenantViewerUser;
    protected Tenant $tenantOne;
    protected Tenant $tenantTwo;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);

        // Get existing test fixtures created by TestFixturesSeeder
        // Central users
        $this->superadminUser = User::where('email', 'superadmin@byteforge.se')->first();
        $this->editorUser = User::where('email', 'editor@byteforge.se')->first();
        $this->viewerUser = User::where('email', 'viewer@byteforge.se')->first();

        // Tenant fixtures
        $this->tenantOne = Tenant::where('slug', 'tenant-one')->first();
        $this->tenantTwo = Tenant::where('slug', 'tenant-two')->first();

        // Tenant users - get from central database first
        $this->tenantOwnerUser = User::where('email', 'user.tenant-one@byteforge.se')->first();
        $this->tenantEditorUser = User::where('email', 'user.tenant-two@byteforge.se')->first();
        $this->tenantViewerUser = User::where('email', 'user.tenant-three@byteforge.se')->first();

        // Assign permissions to tenant users WITHIN tenant context
        tenancy()->initialize($this->tenantOne);
        $tenantOneUser = User::where('email', 'user.tenant-one@byteforge.se')->first();
        $tenantOneUser->syncPermissions(['themes.manage', 'themes.view']);
        tenancy()->end();

        tenancy()->initialize($this->tenantTwo);
        $tenantTwoUser = User::where('email', 'user.tenant-two@byteforge.se')->first();
        $tenantTwoUser->syncPermissions(['themes.view']);
        tenancy()->end();
    }

    /**
     * Phase 6 Step 2: Test central superadmin can customize active theme
     */
    public function test_central_superadmin_can_customize_active_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        Passport::actingAs($this->superadminUser);

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
     * Phase 6 Step 2: Test tenant owner can customize their theme
     */
    public function test_tenant_owner_can_customize_active_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => $this->tenantOne->id,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        // Authenticate BEFORE tenant context initialization
        Passport::actingAs($this->tenantOwnerUser);

        // Initialize tenant context
        tenancy()->initialize($this->tenantOne);
        $domain = $this->tenantOne->domains()->first()->domain;

        $response = $this->postJson("https://{$domain}/api/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --primary-500: #0000ff; }',
            'theme_data' => [
                'colors' => ['primary' => ['500' => '#0000ff']],
            ],
        ]);

        $response->assertStatus(200);

        $theme->refresh();
        $this->assertEquals(':root { --primary-500: #0000ff; }', $theme->settings_css);
    }

    /**
     * Phase 6 Step 2: Test tenant viewer cannot customize (no themes.manage permission)
     */
    public function test_tenant_viewer_cannot_customize_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => $this->tenantTwo->id,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        Passport::actingAs($this->tenantEditorUser);
        tenancy()->initialize($this->tenantTwo);
        $domain = $this->tenantTwo->domains()->first()->domain;

        $response = $this->postJson("https://{$domain}/api/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --hack: red; }',
        ]);

        // Should fail due to missing themes.manage permission
        $response->assertStatus(403);
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

        Passport::actingAs($this->superadminUser);

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

        Passport::actingAs($this->superadminUser);

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

        Passport::actingAs($this->superadminUser);

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

        Passport::actingAs($this->superadminUser);

        // Try to modify 'info' section (not allowed)
        $response = $this->postJson("/api/superadmin/themes/{$theme->id}/customization/info", [
            'css' => '.info { color: red; }',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('section');
    }

    /**
     * Phase 6 Step 2: Test tenant user cannot customize other tenant's theme
     */
    public function test_tenant_user_cannot_customize_other_tenant_theme(): void
    {
        $tenantTwoTheme = Theme::factory()->create([
            'tenant_id' => $this->tenantTwo->id,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        Passport::actingAs($this->tenantOwnerUser);
        tenancy()->initialize($this->tenantOne);
        $domain = $this->tenantOne->domains()->first()->domain;

        $response = $this->postJson("https://{$domain}/api/themes/{$tenantTwoTheme->id}/customization/settings", [
            'css' => ':root { --hack: red; }',
        ]);

        // Should be denied at controller level (403) not middleware
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

        Passport::actingAs($this->superadminUser);

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

    /**
     * Phase 6 Step 2: Test central viewer cannot customize (no themes.manage)
     */
    public function test_central_viewer_cannot_customize(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => false,
            'is_active' => true,
        ]);

        Passport::actingAs($this->viewerUser);

        $response = $this->postJson("/api/superadmin/themes/{$theme->id}/customization/settings", [
            'css' => ':root { --hack: red; }',
        ]);

        $response->assertStatus(403);
    }
}
