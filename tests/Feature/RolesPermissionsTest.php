<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RolesPermissionsTest extends TestCase
{
    /**
     * @var \App\Models\User
     */
    protected $superadmin;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear Spatie cache
        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        // Run the role permission seeder
        $seeder = new RolePermissionSeeder;
        $seeder->run();

        // Ensure superadmin role (api) always has all permissions in test DB
        $superadmin = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
        if ($superadmin) {
            $allPerms = Permission::where('guard_name', 'api')->get();
            $superadmin->syncPermissions($allPerms);
        }

        // Create or get the fixed testadmin user
        $this->superadmin = User::firstOrCreate(
            ['email' => 'testadmin@byteforge.se'],
            [
                'name' => 'Test Admin',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
                'type' => 'superadmin',
            ]
        );
    $this->superadmin->assignRole('superadmin');
    // Ensure the user has all permissions (in case of cache or relationship issues)
    $allPerms = Permission::where('guard_name', 'api')->get();
    $this->superadmin->syncPermissions($allPerms);
    // Re-fetch user and clear permission cache
    $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
    $this->superadmin = User::where('email', 'testadmin@byteforge.se')->first();
    }

    public function test_superadmin_has_global_role_and_permissions()
    {
        $super = User::factory()->create(['type' => 'superadmin']);
        $super->assignRole('superadmin'); // team_foreign_key null

        $this->assertTrue($super->hasRole('superadmin'));
        $this->assertTrue($super->hasPermissionTo('manage users'));
        $this->assertTrue($super->hasPermissionTo('manage tenants'));
        $this->assertFalse($super->hasRole('tenant_owner')); // Ensure no tenant-specific roles
    }

    public function test_tenant_user_role_assignment_and_scoping()
    {
        // Create a tenant
        $tenant = Tenant::create(['id' => 'tenant1', 'name' => 'Tenant 1', 'slug' => 'tenant1']);
        // Boot tenancy / set current tenant context
        tenancy()->initialize($tenant);

        $tenantUser = User::factory()->create(['type' => 'tenant_user']);
        // Create a tenant scoped role
        $role = Role::create(['name' => 'tenant_owner', 'guard_name' => 'api']);
        $tenantUser->assignRole($role);

        $this->assertTrue($tenantUser->hasRole('tenant_owner'));
        $this->assertFalse($tenantUser->hasRole('superadmin')); // shouldn't have global
        $this->assertFalse($tenantUser->hasPermissionTo('manage tenants')); // assuming that is global only

        // End tenancy
        tenancy()->end();
    }

    public function test_global_role_assignment_in_central_context()
    {
        // Ensure no tenant context
        tenancy()->end();

        $user = User::factory()->create();
        $user->assignRole('superadmin');

        $this->assertTrue($user->hasRole('superadmin'));
        $this->assertFalse($user->hasRole('tenant_owner')); // No tenant roles in central
    }

    public function test_tenant_role_assignment_in_tenant_context()
    {
        $tenant = Tenant::create(['id' => 'tenant2', 'name' => 'Tenant 2', 'slug' => 'tenant2']);
        tenancy()->initialize($tenant);

        $user = User::factory()->create(['type' => 'tenant_user']);
        $role = Role::create(['name' => 'tenant_owner', 'guard_name' => 'api']);
        $user->assignRole($role);

        $this->assertTrue($user->hasRole('tenant_owner'));
        $this->assertFalse($user->hasRole('superadmin')); // No global roles in tenant context

        tenancy()->end();
    }

    public function test_tenant_user_cannot_assign_global_role()
    {
        $tenant = Tenant::create(['id' => 'tenant3', 'name' => 'Tenant 3', 'slug' => 'tenant3']);
        tenancy()->initialize($tenant);

        $tenantUser = User::factory()->create(['type' => 'tenant_user']);
        $superRole = Role::where('name', 'superadmin')->first();

        // Tenant user should not be able to assign global role
        $this->assertFalse($tenantUser->can('assign roles')); // Assuming permission exists

        tenancy()->end();
    }

    // CENTRAL CRUD & ASSIGNMENT ENDPOINT TESTS
    public function test_can_list_roles_via_api()
    {
    $this->actingAs($this->superadmin, 'api');
    $response = $this->getJson('/api/superadmin/roles');
    $response->assertOk()->assertJsonStructure([['id', 'name', 'guard_name']]);
    }

    public function test_can_create_role_via_api()
    {
        $this->actingAs($this->superadmin, 'api');
        $response = $this->postJson('/api/superadmin/roles', [
            'name' => 'apitestrole',
            'guard_name' => 'api',
        ]);
        $response->assertCreated()->assertJsonFragment(['name' => 'apitestrole']);
    }

    public function test_can_update_role_via_api()
    {
        $this->actingAs($this->superadmin, 'api');
        $role = Role::create(['name' => 'apiroupdate', 'guard_name' => 'api']);
        $response = $this->putJson("/api/superadmin/roles/{$role->id}", [
            'name' => 'apiroupdated',
        ]);
        $response->assertOk()->assertJsonFragment(['name' => 'apiroupdated']);
    }

    public function test_can_delete_role_via_api()
    {
    $this->actingAs($this->superadmin, 'api');
    $role = Role::create(['name' => 'apideleterole', 'guard_name' => 'api']);
    $response = $this->deleteJson("/api/superadmin/roles/{$role->id}");
    $response->assertOk()->assertJsonFragment(['message' => 'Role deleted']);
    }

    public function test_can_list_permissions_via_api()
    {
    $this->actingAs($this->superadmin, 'api');
    $response = $this->getJson('/api/superadmin/permissions');
    $response->assertOk()->assertJsonStructure([['id', 'name', 'guard_name']]);
    }

    public function test_can_create_permission_via_api()
    {
        $this->actingAs($this->superadmin, 'api');
        $response = $this->postJson('/api/superadmin/permissions', [
            'name' => 'apitestpermission',
            'guard_name' => 'api',
        ]);
        $response->assertCreated()->assertJsonFragment(['name' => 'apitestpermission']);
    }

    public function test_can_update_permission_via_api()
    {
        $this->actingAs($this->superadmin, 'api');
        $permission = Permission::create(['name' => 'apiupdateperm', 'guard_name' => 'api']);
        $response = $this->putJson("/api/superadmin/permissions/{$permission->id}", [
            'name' => 'apiupdatedperm',
        ]);
        $response->assertOk()->assertJsonFragment(['name' => 'apiupdatedperm']);
    }

    public function test_can_delete_permission_via_api()
    {
    $this->actingAs($this->superadmin, 'api');
    $permission = Permission::create(['name' => 'apideleteperm', 'guard_name' => 'api']);
    $response = $this->deleteJson("/api/superadmin/permissions/{$permission->id}");
    $response->assertOk()->assertJsonFragment(['message' => 'Permission deleted']);
    }

    public function test_can_assign_permissions_to_role_via_api()
    {
        $this->actingAs($this->superadmin, 'api');
        $role = Role::create(['name' => 'apiassignrole', 'guard_name' => 'api']);
        $perm = Permission::create(['name' => 'apiassignperm', 'guard_name' => 'api']);
        $response = $this->postJson("/api/superadmin/roles/{$role->id}/permissions", [
            'permissions' => [$perm->name],
        ]);
        $response->assertOk()->assertJsonFragment(['name' => 'apiassignperm']);
    }

    public function test_can_assign_roles_to_user_via_api()
    {
        $this->actingAs($this->superadmin, 'api');
        $user = User::factory()->create();
        $role = Role::create(['name' => 'apiassignroleuser', 'guard_name' => 'api']);
        $response = $this->postJson("/api/superadmin/users/{$user->id}/roles", [
            'roles' => [$role->name],
        ]);
        $response->assertOk()->assertJsonFragment(['name' => 'apiassignroleuser']);
    }
}
