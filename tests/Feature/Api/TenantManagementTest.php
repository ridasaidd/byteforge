<?php

namespace Tests\Feature\Api;

use App\Models\Tenant;
use App\Models\Theme;
use Stancl\Tenancy\Database\Models\Domain;
use Tests\TestCase;

class TenantManagementTest extends TestCase
{

    public function test_can_list_tenants(): void
    {

        // Create some tenants
        $tenant1 = Tenant::create(['id' => '1', 'name' => 'Tenant 1', 'slug' => 'tenant-1']);
        Domain::create(['domain' => 'tenant1.test', 'tenant_id' => $tenant1->id]);

        $tenant2 = Tenant::create(['id' => '2', 'name' => 'Tenant 2', 'slug' => 'tenant-2']);
        Domain::create(['domain' => 'tenant2.test', 'tenant_id' => $tenant2->id]);

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/tenants');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_can_create_tenant(): void
    {

        $data = [
            'name' => 'New Test Tenant',
            'domain' => 'newtest.example.com',
        ];

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', $data);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at'],
            ])
            ->assertJson([
                'data' => [
                    'name' => 'New Test Tenant',
                    'domain' => 'newtest.example.com',
                ],
            ]);

        $this->assertDatabaseHas('tenants', ['name' => 'New Test Tenant']);
        $this->assertDatabaseHas('domains', ['domain' => 'newtest.example.com']);
    }

    public function test_newly_created_tenant_gets_a_default_active_theme_when_system_themes_exist(): void
    {
        Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'slug' => 'tenant-create-default-theme',
            'name' => 'Tenant Create Default Theme',
        ]);

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'name' => 'Provisioned Tenant',
            'domain' => 'provisioned.example.com',
        ]);

        $response->assertStatus(201);

        $tenantId = $response->json('data.id');

        $this->assertNotNull($tenantId);
        $this->assertSame(
            1,
            Theme::query()->where('tenant_id', $tenantId)->where('is_active', true)->count(),
            'Newly created tenants should have exactly one active tenant-scoped theme.',
        );

        $this->assertDatabaseHas('themes', [
            'tenant_id' => $tenantId,
            'is_active' => true,
            'is_system_theme' => false,
        ]);
    }

    public function test_cannot_create_tenant_without_name(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'domain' => 'test.example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_create_tenant_without_domain(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'name' => 'Test Tenant',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }

    public function test_cannot_create_tenant_with_duplicate_domain(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'Existing Tenant', 'slug' => 'existing-tenant']);
        Domain::create(['domain' => 'existing.test', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'name' => 'New Tenant',
            'domain' => 'existing.test',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }

    public function test_can_show_single_tenant(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'Test Tenant', 'slug' => 'test-tenant']);
        Domain::create(['domain' => 'test.example.com', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->getJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $tenant->id,
                    'name' => 'Test Tenant',
                    'domain' => 'test.example.com',
                ],
            ]);
    }

    public function test_can_update_tenant(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'Old Name', 'slug' => 'old-name']);
        Domain::create(['domain' => 'old.test', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->putJson("/api/superadmin/tenants/{$tenant->id}", [
            'name' => 'New Name',
            'domain' => 'new.test',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'New Name',
                    'domain' => 'new.test',
                ],
            ]);

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'name' => 'New Name']);
        $this->assertDatabaseHas('domains', ['tenant_id' => $tenant->id, 'domain' => 'new.test']);
    }

    public function test_can_delete_tenant(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'To Delete', 'slug' => 'to-delete']);
        Domain::create(['domain' => 'delete.test', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->deleteJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Tenant deleted successfully']);

        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
    }

    public function test_requires_authentication(): void
    {
        // No authentication - should get 401
        $response = $this->getJson('/api/superadmin/tenants');
        $response->assertStatus(401);
    }

    public function test_requires_manage_tenants_permission(): void
    {
        // User with no permissions should be rejected
        $user = \App\Models\User::factory()->create();
        $response = $this->actingAs($user, 'api')->postJson('/api/superadmin/tenants', [
            'name' => 'Test',
            'domain' => 'forbidden.test',
        ]);
        $response->assertStatus(403);
    }
}
