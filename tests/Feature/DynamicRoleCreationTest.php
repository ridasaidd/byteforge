<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;
use Tests\CreatesPassportClient;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DynamicRoleCreationTest extends TestCase
{
    use CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();

        // Seed initial roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    }

    #[Test]
    public function super_admin_can_create_new_role_with_permissions()
    {
        $timestamp = time();

        // Step 1: Create super super admin (you)
        $superSuperAdmin = User::factory()->create([
            'name' => 'Super Super Admin',
            'email' => "super{$timestamp}@example.com",
            'type' => 'superadmin',
        ]);

        // Assign superadmin role with all permissions
        $superadminRole = Role::findByName('superadmin');
        $superSuperAdmin->assignRole($superadminRole);

        // Step 2: Create new custom role "Editor"
        $editorRole = Role::create(['name' => "Editor{$timestamp}"]);

        // Step 3: Assign specific permissions to Editor role
        $editorRole->givePermissionTo([
            'pages.create',
            'pages.edit',
            'pages.view',
            'navigation.create',
            'navigation.edit',
            'navigation.view',
            'view analytics',
        ]);

        // Step 4: Create new superadmin user
        $newSuperadmin = User::factory()->create([
            'name' => 'New Editor Admin',
            'email' => "editor{$timestamp}@example.com",
            'type' => 'superadmin',
        ]);

        // Step 5: Assign Editor role to new superadmin
        $newSuperadmin->assignRole($editorRole);

        // VERIFICATION: Check role was created
        $this->assertDatabaseHas('roles', [
            'name' => "Editor{$timestamp}",
        ]);

        // VERIFICATION: Check permissions assigned to role
        $this->assertTrue($editorRole->hasPermissionTo('pages.create'));
        $this->assertTrue($editorRole->hasPermissionTo('pages.edit'));
        $this->assertTrue($editorRole->hasPermissionTo('view analytics'));

        // VERIFICATION: Check user has role
        $this->assertTrue($newSuperadmin->hasRole("Editor{$timestamp}"));

        // VERIFICATION: Check user has permissions via role
        $this->assertTrue($newSuperadmin->can('pages.create'));
        $this->assertTrue($newSuperadmin->can('pages.edit'));
        $this->assertTrue($newSuperadmin->can('view analytics'));

        // VERIFICATION: Check user DOESN'T have permissions not assigned to Editor
        $this->assertFalse($newSuperadmin->can('manage users'));
        $this->assertFalse($newSuperadmin->can('manage tenants'));
        $this->assertFalse($newSuperadmin->can('pages.delete'));
    }

    #[Test]
    public function editor_superadmin_can_view_pages_but_not_manage_users()
    {
        $timestamp = time();

        // Create Editor role with limited permissions (use 'api' guard)
        $editorRole = Role::create(['name' => "Content Editor{$timestamp}", 'guard_name' => 'api']);
        $editorRole->givePermissionTo([
            'pages.create',
            'pages.edit',
            'pages.view',
            'view content',
        ]);

        // Create superadmin with Editor role
        $editorAdmin = User::factory()->create([
            'type' => 'superadmin',
        ]);
        $editorAdmin->assignRole($editorRole);

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Refresh user to load permissions
        $editorAdmin->refresh();
        $editorAdmin->load('roles', 'permissions');

        // Test: Can access superadmin routes (type check passes)
        $response = $this->actingAs($editorAdmin, 'api')
            ->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/tenants');

        // Should NOT be 403 (middleware allows superadmin type)
        $this->assertNotEquals(403, $response->status());

        // Test: Has page permissions
        $this->assertTrue($editorAdmin->can('pages.create'));
        $this->assertTrue($editorAdmin->can('pages.edit'));
        $this->assertTrue($editorAdmin->can('pages.view'));

        // Test: Does NOT have user/tenant management permissions
        $this->assertFalse($editorAdmin->can('manage users'));
        $this->assertFalse($editorAdmin->can('manage tenants'));
        $this->assertFalse($editorAdmin->can('access billing'));
    }

    #[Test]
    public function can_modify_role_permissions_dynamically()
    {
        $timestamp = time();

        // Create role with minimal permissions
        $role = Role::create(['name' => "Junior Editor{$timestamp}"]);
        $role->givePermissionTo(['pages.view']);

        // Create user with this role
        $user = User::factory()->create(['type' => 'superadmin']);
        $user->assignRole($role);

        // Verify initial permission
        $this->assertTrue($user->can('pages.view'));
        $this->assertFalse($user->can('pages.edit'));

        // SIMULATE: Super admin adds more permissions to role
        $role->givePermissionTo(['pages.edit', 'pages.create']);

        // Clear permission cache (Spatie caches permissions)
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Refresh user to get new permissions
        $user->refresh();
        $user->load('roles', 'permissions');

        // Verify permissions updated
        $this->assertTrue($user->can('pages.view'));
        $this->assertTrue($user->can('pages.edit'));
        $this->assertTrue($user->can('pages.create'));
    }

    #[Test]
    public function can_remove_permissions_from_role()
    {
        $timestamp = time();

        // Create role with permissions
        $role = Role::create(['name' => "Senior Editor{$timestamp}"]);
        $role->givePermissionTo([
            'pages.create',
            'pages.edit',
            'pages.delete',
            'pages.view',
        ]);

        // Create user
        $user = User::factory()->create(['type' => 'superadmin']);
        $user->assignRole($role);

        // Verify has all permissions
        $this->assertTrue($user->can('pages.delete'));

        // SIMULATE: Super admin removes delete permission
        $role->revokePermissionTo('pages.delete');

        // Clear cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        $user->refresh();
        $user->load('roles', 'permissions');

        // Verify permission removed
        $this->assertTrue($user->can('pages.view'));
        $this->assertTrue($user->can('pages.edit'));
        $this->assertFalse($user->can('pages.delete')); // ← Removed
    }

    #[Test]
    public function can_assign_multiple_roles_to_user()
    {
        $timestamp = time();

        // Create two roles with different permissions
        $contentRole = Role::create(['name' => "Content Manager{$timestamp}"]);
        $contentRole->givePermissionTo(['pages.create', 'pages.edit', 'pages.view']);

        $analyticsRole = Role::create(['name' => "Analytics Viewer{$timestamp}"]);
        $analyticsRole->givePermissionTo(['view analytics', 'view content']);

        // Create user and assign BOTH roles
        $user = User::factory()->create(['type' => 'superadmin']);
        $user->assignRole([$contentRole, $analyticsRole]);

        // Verify user has permissions from BOTH roles
        $this->assertTrue($user->can('pages.create')); // From Content Manager
        $this->assertTrue($user->can('pages.edit'));   // From Content Manager
        $this->assertTrue($user->can('view analytics')); // From Analytics Viewer

        // Verify user does NOT have permissions not in either role
        $this->assertFalse($user->can('manage users'));
        $this->assertFalse($user->can('pages.delete'));
    }

    #[Test]
    public function creating_new_permission_and_assigning_to_role_works()
    {
        $timestamp = time();

        // SIMULATE: Super admin creates new permission from dashboard
        $newPermission = Permission::create(['name' => "export data{$timestamp}"]);

        // Create role and assign new permission
        $role = Role::create(['name' => "Data Analyst{$timestamp}"]);
        $role->givePermissionTo(['view analytics', 'view content', "export data{$timestamp}"]);

        // Create user with this role
        $user = User::factory()->create(['type' => 'superadmin']);
        $user->assignRole($role);

        // Verify user has the new permission
        $this->assertTrue($user->can("export data{$timestamp}"));

        // Verify new permission exists in database
        $this->assertDatabaseHas('permissions', [
            'name' => "export data{$timestamp}",
        ]);
    }
}
