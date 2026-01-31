<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed the roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    }

    public function test_new_permissions_exist()
    {
        $newPermissions = [
            'themes.view', 'themes.manage', 'themes.activate',
            'layouts.view', 'layouts.manage',
            'templates.view', 'templates.manage',
            'media.view', 'media.manage',
            'view dashboard stats',
        ];

        foreach ($newPermissions as $permission) {
            $this->assertTrue(
                Permission::where('name', $permission)
                    ->where('guard_name', 'api')
                    ->exists(),
                "Permission '{$permission}' should exist for api guard"
            );
        }
    }

    public function test_superadmin_has_all_permissions()
    {
        $superadmin = Role::where('name', 'superadmin')
            ->where('guard_name', 'api')
            ->first();

        $this->assertNotNull($superadmin);

        $allPermissions = Permission::where('guard_name', 'api')->count();
        $superadminPermissions = $superadmin->permissions()->count();

        $this->assertEquals(
            $allPermissions,
            $superadminPermissions,
            'Superadmin should have all api permissions'
        );
    }

    public function test_admin_has_expected_permissions()
    {
        $admin = Role::where('name', 'admin')
            ->where('guard_name', 'api')
            ->first();

        $this->assertNotNull($admin);

        $expectedPermissions = [
            'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
            'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
            'themes.view', 'themes.manage', 'themes.activate',
            'layouts.view', 'layouts.manage',
            'templates.view', 'templates.manage',
            'media.view', 'media.manage',
            'manage users', 'view users',
            'manage tenants', 'view tenants',
            'manage roles',
            'view analytics', 'view dashboard stats',
            'view activity logs',
            'view settings', 'manage settings',
        ];

        foreach ($expectedPermissions as $permission) {
            $this->assertTrue(
                $admin->hasPermissionTo($permission),
                "Admin role should have '{$permission}' permission"
            );
        }
    }

    public function test_support_role_has_readonly_permissions()
    {
        $support = Role::where('name', 'support')
            ->where('guard_name', 'api')
            ->first();

        $this->assertNotNull($support);

        // Should have view permissions
        $this->assertTrue($support->hasPermissionTo('pages.view'));
        $this->assertTrue($support->hasPermissionTo('view users'));
        $this->assertTrue($support->hasPermissionTo('view activity logs'));

        // Should NOT have manage permissions
        $this->assertFalse($support->hasPermissionTo('pages.create'));
        $this->assertFalse($support->hasPermissionTo('manage users'));
    }

    public function test_viewer_role_is_most_restricted()
    {
        $viewer = Role::where('name', 'viewer')
            ->where('guard_name', 'api')
            ->first();

        $this->assertNotNull($viewer);

        // Should have minimal view permissions
        $this->assertTrue($viewer->hasPermissionTo('pages.view'));
        $this->assertTrue($viewer->hasPermissionTo('view users'));

        // Should NOT have activity log access
        $this->assertFalse($viewer->hasPermissionTo('view activity logs'));
        $this->assertFalse($viewer->hasPermissionTo('manage users'));
    }

    public function test_dashboard_stats_requires_permission()
    {
        // Create a user with no permissions
        $userNoPerms = User::factory()->create();
        $userNoPerms->syncRoles([]); // Clear factory default
        $userNoPerms->syncPermissions([]); // Clear all permissions

        // Create a user with the permission
        $userWithPerms = User::factory()->create();
        $userWithPerms->syncRoles([]); // Clear factory default
        $userWithPerms->givePermissionTo('view dashboard stats');

        // User without permission should be rejected
        $response = $this->actingAs($userNoPerms, 'api')
            ->getJson('/api/superadmin/dashboard/stats');

        $this->assertEquals(403, $response->status());

        // User with permission should get through
        $response = $this->actingAs($userWithPerms, 'api')
            ->getJson('/api/superadmin/dashboard/stats');

        // Either 200 or some error other than 403 (permission denied)
        $this->assertNotEquals(403, $response->status());
    }

    public function test_pages_resource_requires_permission()
    {
        // Create users with different permission levels
        $userNoPerms = User::factory()->create();
        $userNoPerms->syncRoles([]);
        $userNoPerms->syncPermissions([]);

        $userWithViewPerms = User::factory()->create();
        $userWithViewPerms->syncRoles([]);
        $userWithViewPerms->givePermissionTo('pages.view');

        $userWithManagePerms = User::factory()->create();
        $userWithManagePerms->syncRoles([]);
        $userWithManagePerms->givePermissionTo('pages.create', 'pages.edit', 'pages.delete', 'pages.view');

        // User without permissions should be rejected
        $response = $this->actingAs($userNoPerms, 'api')
            ->getJson('/api/superadmin/pages');
        $this->assertEquals(403, $response->status());

        // User with view permissions should get through
        $response = $this->actingAs($userWithViewPerms, 'api')
            ->getJson('/api/superadmin/pages');
        $this->assertNotEquals(403, $response->status());

        // User with manage permissions should get through
        $response = $this->actingAs($userWithManagePerms, 'api')
            ->getJson('/api/superadmin/pages');
        $this->assertNotEquals(403, $response->status());
    }

    public function test_themes_management_requires_manage_permission()
    {
        $userWithViewOnly = User::factory()->create();
        // Clear all roles/permissions from factory default
        $userWithViewOnly->syncRoles([]);
        $userWithViewOnly->givePermissionTo('themes.view');

        $userWithManage = User::factory()->create();
        // Clear all roles/permissions from factory default
        $userWithManage->syncRoles([]);
        $userWithManage->givePermissionTo('themes.manage');

        // GET (view) should work with view permission
        $response = $this->actingAs($userWithViewOnly, 'api')
            ->getJson('/api/superadmin/themes');
        $this->assertNotEquals(403, $response->status());

        // POST (create) should fail with view-only permission
        $response = $this->actingAs($userWithViewOnly, 'api')
            ->postJson('/api/superadmin/themes', ['name' => 'Test']);
        $this->assertEquals(403, $response->status());

        // POST (create) should work with manage permission
        $response = $this->actingAs($userWithManage, 'api')
            ->postJson('/api/superadmin/themes', ['name' => 'Test']);
        $this->assertNotEquals(403, $response->status());
    }

    public function test_media_endpoints_are_protected()
    {
        $userNoPerms = User::factory()->create();
        $userNoPerms->syncRoles([]);
        $userNoPerms->syncPermissions([]);

        $userWithPerms = User::factory()->create();
        $userWithPerms->syncRoles([]);
        $userWithPerms->givePermissionTo('media.view', 'media.manage');

        // Without permission
        $response = $this->actingAs($userNoPerms, 'api')
            ->getJson('/api/superadmin/media');
        $this->assertEquals(403, $response->status());

        // With permission
        $response = $this->actingAs($userWithPerms, 'api')
            ->getJson('/api/superadmin/media');
        $this->assertNotEquals(403, $response->status());
    }
}
