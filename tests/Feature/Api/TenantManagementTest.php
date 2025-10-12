<?php

namespace Tests\Feature\Api;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Stancl\Tenancy\Database\Models\Domain;
use Tests\TestCase;

class TenantManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        // Create superadmin user
        $this->superadmin = User::factory()->create();
        $this->superadmin->assignRole('superadmin');
    }

    public function test_can_list_tenants(): void
    {
        Passport::actingAs($this->superadmin);

        // Create some tenants
        $tenant1 = Tenant::create(['id' => '1', 'name' => 'Tenant 1', 'slug' => 'tenant-1']);
        Domain::create(['domain' => 'tenant1.test', 'tenant_id' => $tenant1->id]);

        $tenant2 = Tenant::create(['id' => '2', 'name' => 'Tenant 2', 'slug' => 'tenant-2']);
        Domain::create(['domain' => 'tenant2.test', 'tenant_id' => $tenant2->id]);

        $response = $this->getJson('/api/superadmin/tenants');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at']
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total']
            ]);
    }

    public function test_can_create_tenant(): void
    {
        Passport::actingAs($this->superadmin);

        $data = [
            'name' => 'New Test Tenant',
            'domain' => 'newtest.example.com',
        ];

        $response = $this->postJson('/api/superadmin/tenants', $data);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at']
            ])
            ->assertJson([
                'data' => [
                    'name' => 'New Test Tenant',
                    'domain' => 'newtest.example.com',
                ]
            ]);

        $this->assertDatabaseHas('tenants', ['name' => 'New Test Tenant']);
        $this->assertDatabaseHas('domains', ['domain' => 'newtest.example.com']);
    }

    public function test_cannot_create_tenant_without_name(): void
    {
        Passport::actingAs($this->superadmin);

        $response = $this->postJson('/api/superadmin/tenants', [
            'domain' => 'test.example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_create_tenant_without_domain(): void
    {
        Passport::actingAs($this->superadmin);

        $response = $this->postJson('/api/superadmin/tenants', [
            'name' => 'Test Tenant',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }

    public function test_cannot_create_tenant_with_duplicate_domain(): void
    {
        Passport::actingAs($this->superadmin);

        $tenant = Tenant::create(['id' => '1', 'name' => 'Existing Tenant', 'slug' => 'existing-tenant']);
        Domain::create(['domain' => 'existing.test', 'tenant_id' => $tenant->id]);

        $response = $this->postJson('/api/superadmin/tenants', [
            'name' => 'New Tenant',
            'domain' => 'existing.test',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }

    public function test_can_show_single_tenant(): void
    {
        Passport::actingAs($this->superadmin);

        $tenant = Tenant::create(['id' => '1', 'name' => 'Test Tenant', 'slug' => 'test-tenant']);
        Domain::create(['domain' => 'test.example.com', 'tenant_id' => $tenant->id]);

        $response = $this->getJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $tenant->id,
                    'name' => 'Test Tenant',
                    'domain' => 'test.example.com',
                ]
            ]);
    }

    public function test_can_update_tenant(): void
    {
        Passport::actingAs($this->superadmin);

        $tenant = Tenant::create(['id' => '1', 'name' => 'Old Name', 'slug' => 'old-name']);
        Domain::create(['domain' => 'old.test', 'tenant_id' => $tenant->id]);

        $response = $this->putJson("/api/superadmin/tenants/{$tenant->id}", [
            'name' => 'New Name',
            'domain' => 'new.test',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'New Name',
                    'domain' => 'new.test',
                ]
            ]);

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'name' => 'New Name']);
        $this->assertDatabaseHas('domains', ['tenant_id' => $tenant->id, 'domain' => 'new.test']);
    }

    public function test_can_delete_tenant(): void
    {
        Passport::actingAs($this->superadmin);

        $tenant = Tenant::create(['id' => '1', 'name' => 'To Delete', 'slug' => 'to-delete']);
        Domain::create(['domain' => 'delete.test', 'tenant_id' => $tenant->id]);

        $response = $this->deleteJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Tenant deleted successfully']);

        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
    }

    public function test_requires_authentication(): void
    {
        $response = $this->getJson('/api/superadmin/tenants');
        $response->assertStatus(401);
    }

    public function test_requires_superadmin_role(): void
    {
        $regularUser = User::factory()->create();
        Passport::actingAs($regularUser);

        $response = $this->getJson('/api/superadmin/tenants');
        $response->assertStatus(403);
    }
}
