<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Membership;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;

class TenantManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superadmin = User::factory()->create([
            'type' => 'superadmin',
            'email' => 'superadmin@test.com',
        ]);

        Passport::actingAs($this->superadmin);
    }

    public function test_superadmin_can_list_all_tenants()
    {
        Tenant::factory()->count(3)->create();

        $response = $this->getJson('/api/superadmin/tenants');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'domain', 'status', 'memberships_count'],
                ],
            ])
            ->assertJsonCount(3, 'data');
    }

    public function test_superadmin_can_view_single_tenant()
    {
        $tenant = Tenant::factory()->create(['name' => 'Test Tenant']);

        $response = $this->getJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $tenant->id,
                    'name' => 'Test Tenant',
                ],
            ]);
    }

    public function test_superadmin_can_create_tenant()
    {
        $response = $this->postJson('/api/superadmin/tenants', [
            'name' => 'New Tenant',
            'domain' => 'newtenant.example.com',
            'email' => 'contact@newtenant.com',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Tenant created successfully',
                'data' => [
                    'name' => 'New Tenant',
                    'domain' => 'newtenant.example.com',
                ],
            ]);
        $tenantId = $response->json('data.id');
        // Tenant top-level columns
        $this->assertDatabaseHas('tenants', [
            'id' => $tenantId,
            'name' => 'New Tenant',
        ]);
        // Domain is stored in domains table
        $this->assertDatabaseHas('domains', [
            'tenant_id' => $tenantId,
            'domain' => 'newtenant.example.com',
        ]);
    }

    public function test_tenant_id_is_auto_generated_from_name()
    {
        $response = $this->postJson('/api/superadmin/tenants', [
            'name' => 'My Test Company',
            'domain' => 'mytest.example.com',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('tenants', [
            'id' => 'my-test-company',
            'name' => 'My Test Company',
        ]);
    }

    public function test_superadmin_can_update_tenant()
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Old Name',
            'status' => 'active',
        ]);

        $response = $this->putJson("/api/superadmin/tenants/{$tenant->id}", [
            'name' => 'New Name',
            'status' => 'suspended',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Tenant updated successfully',
            ])
            ->assertJsonPath('data.name', 'New Name');
        // Verify DB updated: top-level name and VirtualColumn status attribute
        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'name' => 'New Name',
        ]);
        $this->assertEquals('suspended', Tenant::find($tenant->id)->status);
    }

    public function test_superadmin_can_delete_tenant()
    {
        $tenant = Tenant::factory()->create();

        $response = $this->deleteJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Tenant deleted successfully',
            ]);

        $this->assertDatabaseMissing('tenants', [
            'id' => $tenant->id,
        ]);
    }

    public function test_superadmin_can_add_user_to_tenant()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['type' => 'tenant_user']);

        $response = $this->postJson("/api/superadmin/tenants/{$tenant->id}/users", [
            'user_id' => $user->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'User added to tenant successfully',
            ]);

        $this->assertDatabaseHas('memberships', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'admin',
        ]);
    }

    public function test_adding_user_twice_updates_existing_membership()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['type' => 'tenant_user']);

        // First add
        Membership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'member',
            'status' => 'active',
        ]);

        // Second add with different role
        $response = $this->postJson("/api/superadmin/tenants/{$tenant->id}/users", [
            'user_id' => $user->id,
            'role' => 'admin',
        ]);

        $response->assertStatus(201);

        // Check only one membership exists with updated role
        $this->assertDatabaseCount('memberships', 1);
        $this->assertDatabaseHas('memberships', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'admin',
        ]);
    }

    public function test_superadmin_can_remove_user_from_tenant()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['type' => 'tenant_user']);

        Membership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'member',
            'status' => 'active',
        ]);

        $response = $this->deleteJson("/api/superadmin/tenants/{$tenant->id}/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'User removed from tenant successfully',
            ]);

        $this->assertDatabaseMissing('memberships', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_removing_non_member_returns_404()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['type' => 'tenant_user']);

        $response = $this->deleteJson("/api/superadmin/tenants/{$tenant->id}/users/{$user->id}");

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'User is not a member of this tenant',
            ]);
    }

    public function test_non_superadmin_cannot_create_tenant()
    {
        $normalUser = User::factory()->create(['type' => 'tenant_user']);
        Passport::actingAs($normalUser);

        $response = $this->postJson('/api/superadmin/tenants', [
            'name' => 'Unauthorized Tenant',
            'domain' => 'unauthorized.example.com',
        ]);

        $response->assertStatus(403);
    }

    public function test_validation_prevents_duplicate_domain()
    {
        $tenant = Tenant::factory()->create();
        // Manually create a domain with specific name
        $tenant->domains()->first()->update(['domain' => 'existing.example.com']);

        $response = $this->postJson('/api/superadmin/tenants', [
            'name' => 'New Tenant',
            'domain' => 'existing.example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }
}
