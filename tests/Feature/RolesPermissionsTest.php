<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RolesPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear Spatie cache
        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        // Run the role permission seeder
        $seeder = new RolePermissionSeeder;
        $seeder->run();
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
        $role = Role::create(['name' => 'tenant_owner']);
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
        $role = Role::create(['name' => 'tenant_owner']);
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
}
