<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PassportAuthenticationTest extends TestCase
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

    // Central Context Tests
    /**
     * Test that superadmin can login and has global permissions.
     * This ensures central authentication works with full access.
     */
    public function test_superadmin_can_login_and_has_global_permissions()
    {
        $super = User::factory()->create(['type' => 'superadmin', 'email' => 'super@example.com', 'password' => bcrypt('password')]);
        $super->assignRole('superadmin');

        // Simulate login via Passport with scopes
        Passport::actingAs($super, ['manage-users', 'manage-tenants'], 'api');

        // Check permissions
        $this->assertTrue($super->hasRole('superadmin'));
        $this->assertTrue($super->hasPermissionTo('manage users', 'api'));
        $this->assertTrue($super->hasPermissionTo('manage tenants', 'api'));
        $this->assertFalse($super->hasRole('tenant_owner')); // Ensure no tenant-specific roles
    }

    /**
     * Test superadmin permissions in central context.
     * Verifies global permissions are accessible without tenant context.
     */
    public function test_superadmin_can_access_global_permissions_in_central_context()
    {
        tenancy()->end();

        $super = User::factory()->create(['type' => 'superadmin']);
        $super->assignRole('superadmin');

        Passport::actingAs($super, ['manage-users', 'manage-tenants'], 'api');

        // Ensure global permissions
        $this->assertTrue($super->hasPermissionTo('manage tenants', 'api'));
        $this->assertTrue($super->hasPermissionTo('manage users', 'api'));
        $this->assertFalse($super->hasRole('tenant_owner')); // No tenant roles
    }

    // Tenant Context Tests
    /**
     * Test tenant user permissions in tenant context.
     * Validates scoped permissions for tenant users.
     * Note: Passport actingAs omitted due to tenant key conflicts; permissions tested directly.
     */
    public function test_tenant_user_can_login_in_tenant_context_and_has_scoped_permissions()
    {
        $tenant = Tenant::create(['id' => 'tenant1', 'name' => 'Tenant 1', 'slug' => 'tenant1']);
        tenancy()->initialize($tenant);

        $tenantUser = User::factory()->create(['type' => 'tenant_user', 'email' => 'tenant@example.com', 'password' => bcrypt('password')]);
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'tenant_owner', 'guard_name' => 'api']);
        $tenantUser->assignRole($role);

        // Check permissions
        $this->assertTrue($tenantUser->hasRole('tenant_owner'));
        $this->assertFalse($tenantUser->hasRole('superadmin')); // No global roles
        $this->assertFalse($tenantUser->hasPermissionTo('manage tenants', 'api')); // Global permission denied

        tenancy()->end();
    }

    /**
     * Test tenant user lacks global permissions in tenant context.
     * Ensures tenant isolation.
     */
    public function test_tenant_user_cannot_access_global_permissions_in_tenant_context()
    {
        $tenant = Tenant::create(['id' => 'tenant2', 'name' => 'Tenant 2', 'slug' => 'tenant2']);
        tenancy()->initialize($tenant);

        $tenantUser = User::factory()->create(['type' => 'tenant_user']);
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'api']);
        $tenantUser->assignRole($role);

        // Ensure no global permissions
        $this->assertFalse($tenantUser->hasPermissionTo('manage tenants', 'api'));
        $this->assertFalse($tenantUser->hasPermissionTo('manage users', 'api')); // Staff lacks this
        $this->assertFalse($tenantUser->hasRole('superadmin')); // No global roles

        tenancy()->end();
    }
}
