<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\PageTemplate;
use Laravel\Passport\Passport;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Phase 6 Step 7: Theme Templates API Tests
 *
 * Tests for the active theme templates endpoint that should query
 * the page_templates table instead of theme_data['templates']
 */
class ThemeTemplatesApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that getting templates from active theme returns page_templates
     */
    public function test_get_active_templates_returns_page_templates(): void
    {
        Passport::actingAs($this->getCentralUser('superadmin'));

        // Create active theme with templates
        $theme = Theme::factory()->create([
            'is_active' => true,
            'tenant_id' => null,
        ]);

        PageTemplate::factory()->create([
            'theme_id' => $theme->id,
            'name' => 'Home',
            'is_active' => true,
        ]);

        PageTemplate::factory()->create([
            'theme_id' => $theme->id,
            'name' => 'About',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/superadmin/themes/active/templates');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.name', 'Home');
        $response->assertJsonPath('data.1.name', 'About');
    }

    /**
     * Test that inactive templates are excluded
     */
    public function test_get_active_templates_excludes_inactive_templates(): void
    {
        Passport::actingAs($this->getCentralUser('superadmin'));

        $theme = Theme::factory()->create([
            'is_active' => true,
            'tenant_id' => null,
        ]);

        // Active template
        PageTemplate::factory()->create([
            'theme_id' => $theme->id,
            'name' => 'Active Template',
            'is_active' => true,
        ]);

        // Inactive template
        PageTemplate::factory()->create([
            'theme_id' => $theme->id,
            'name' => 'Inactive Template',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/superadmin/themes/active/templates');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Active Template');
    }

    /**
     * Test that templates from non-active themes are excluded
     */
    public function test_get_active_templates_only_from_active_theme(): void
    {
        Passport::actingAs($this->getCentralUser('superadmin'));

        // Active theme
        $activeTheme = Theme::factory()->create([
            'is_active' => true,
            'tenant_id' => null,
        ]);

        PageTemplate::factory()->create([
            'theme_id' => $activeTheme->id,
            'name' => 'Active Theme Template',
            'is_active' => true,
        ]);

        // Inactive theme
        $inactiveTheme = Theme::factory()->create([
            'is_active' => false,
            'tenant_id' => null,
        ]);

        PageTemplate::factory()->create([
            'theme_id' => $inactiveTheme->id,
            'name' => 'Inactive Theme Template',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/superadmin/themes/active/templates');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Active Theme Template');
    }

    /**
     * Test that empty array is returned when no templates exist
     */
    public function test_get_active_templates_returns_empty_when_no_templates(): void
    {
        Passport::actingAs($this->getCentralUser('superadmin'));

        Theme::factory()->create([
            'is_active' => true,
            'tenant_id' => null,
        ]);

        $response = $this->getJson('/api/superadmin/themes/active/templates');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    /**
     * Test that templates are scoped to tenant when tenant_id is provided
     */
    public function test_get_active_templates_scoped_to_tenant(): void
    {
        Passport::actingAs($this->getCentralUser('superadmin'));

        // Use an actual tenant from test fixtures
        $tenant = $this->getTenant('tenant-one');
        $tenantId = $tenant->id;

        // Tenant theme
        $tenantTheme = Theme::factory()->create([
            'is_active' => true,
            'tenant_id' => $tenantId,
        ]);

        PageTemplate::factory()->create([
            'theme_id' => $tenantTheme->id,
            'name' => 'Tenant Template',
            'is_active' => true,
        ]);

        // Central theme (should not be returned for tenant)
        $centralTheme = Theme::factory()->create([
            'is_active' => true,
            'tenant_id' => null,
        ]);

        PageTemplate::factory()->create([
            'theme_id' => $centralTheme->id,
            'name' => 'Central Template',
            'is_active' => true,
        ]);

        // Note: Actual tenant scoping would happen through middleware/route context
        // This test assumes the service method receives tenant_id
        $response = $this->getJson('/api/superadmin/themes/active/templates');

        $response->assertOk();
        // Should only return central templates when not in tenant context
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Central Template', $data[0]['name']);
    }
}
