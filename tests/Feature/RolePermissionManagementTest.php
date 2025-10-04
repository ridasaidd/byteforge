<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use PHPUnit\Framework\Attributes\Test;

class RolePermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        // Create superadmin user
        $this->superadmin = User::factory()->create([
            'type' => 'superadmin',
            'email' => 'superadmin@example.com',
        ]);

        // Authenticate as superadmin for API requests
        Passport::actingAs($this->superadmin);
    }

    #[Test]
    public function superadmin_can_create_role_with_permissions()
    {
        // Create some permissions first
        Permission::create(['name' => 'view_dashboard', 'guard_name' => 'api']);
        Permission::create(['name' => 'edit_content', 'guard_name' => 'api']);

        $response = $this->postJson('/api/superadmin/roles', [
            'name' => 'Content Editor',
            'guard' => 'api',
            'permissions' => ['view_dashboard', 'edit_content'],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Role created successfully',
                'data' => [
                    'name' => 'Content Editor',
                    'guard_name' => 'api',
                ],
            ]);

        $this->assertDatabaseHas('roles', [
            'name' => 'Content Editor',
            'guard_name' => 'api',
        ]);

        // Verify permissions were assigned
        $role = Role::where('name', 'Content Editor')->first();
        $this->assertTrue($role->hasPermissionTo('view_dashboard'));
        $this->assertTrue($role->hasPermissionTo('edit_content'));
    }

    #[Test]
    public function superadmin_can_list_all_roles()
    {
        Role::create(['name' => 'Editor', 'guard_name' => 'api']);
        Role::create(['name' => 'Viewer', 'guard_name' => 'api']);

        $response = $this->getJson('/api/superadmin/roles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'guard_name', 'permissions'],
                ],
            ])
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function superadmin_can_view_single_role()
    {
        $role = Role::create(['name' => 'Test Role', 'guard_name' => 'api']);
        $permission = Permission::create(['name' => 'test_permission', 'guard_name' => 'api']);
        $role->givePermissionTo($permission);

        $response = $this->getJson("/api/superadmin/roles/{$role->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $role->id,
                    'name' => 'Test Role',
                    'permissions' => [
                        ['name' => 'test_permission'],
                    ],
                ],
            ]);
    }

    #[Test]
    public function superadmin_can_update_role()
    {
        $role = Role::create(['name' => 'Old Name', 'guard_name' => 'api']);
        $permission1 = Permission::create(['name' => 'permission1', 'guard_name' => 'api']);
        $permission2 = Permission::create(['name' => 'permission2', 'guard_name' => 'api']);

        $role->givePermissionTo($permission1);

        $response = $this->putJson("/api/superadmin/roles/{$role->id}", [
            'name' => 'New Name',
            'permissions' => ['permission2'],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Role updated successfully',
                'data' => [
                    'name' => 'New Name',
                ],
            ]);

        $role->refresh();
        $this->assertEquals('New Name', $role->name);
        $this->assertFalse($role->hasPermissionTo('permission1'));
        $this->assertTrue($role->hasPermissionTo('permission2'));
    }

    #[Test]
    public function superadmin_can_delete_role()
    {
        $role = Role::create(['name' => 'To Delete', 'guard_name' => 'api']);

        $response = $this->deleteJson("/api/superadmin/roles/{$role->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Role deleted successfully',
            ]);

        $this->assertDatabaseMissing('roles', [
            'name' => 'To Delete',
        ]);
    }

    #[Test]
    public function superadmin_can_create_permission()
    {
        $response = $this->postJson('/api/superadmin/permissions', [
            'name' => 'manage_users',
            'guard' => 'api',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Permission created successfully',
                'data' => [
                    'name' => 'manage_users',
                    'guard_name' => 'api',
                ],
            ]);

        $this->assertDatabaseHas('permissions', [
            'name' => 'manage_users',
            'guard_name' => 'api',
        ]);
    }

    #[Test]
    public function superadmin_can_list_all_permissions()
    {
        Permission::create(['name' => 'permission1', 'guard_name' => 'api']);
        Permission::create(['name' => 'permission2', 'guard_name' => 'api']);

        $response = $this->getJson('/api/superadmin/permissions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'guard_name', 'roles'],
                ],
            ])
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function superadmin_can_update_permission()
    {
        $permission = Permission::create(['name' => 'old_permission', 'guard_name' => 'api']);

        $response = $this->putJson("/api/superadmin/permissions/{$permission->id}", [
            'name' => 'new_permission',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Permission updated successfully',
                'data' => [
                    'name' => 'new_permission',
                ],
            ]);

        $this->assertDatabaseHas('permissions', [
            'id' => $permission->id,
            'name' => 'new_permission',
        ]);
    }

    #[Test]
    public function superadmin_can_delete_permission()
    {
        $permission = Permission::create(['name' => 'to_delete', 'guard_name' => 'api']);

        $response = $this->deleteJson("/api/superadmin/permissions/{$permission->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Permission deleted successfully',
            ]);

        $this->assertDatabaseMissing('permissions', [
            'name' => 'to_delete',
        ]);
    }

    #[Test]
    public function non_superadmin_cannot_create_role()
    {
        $normalUser = User::factory()->create(['type' => 'tenant_user']);
        Passport::actingAs($normalUser);

        $response = $this->postJson('/api/superadmin/roles', [
            'name' => 'Unauthorized Role',
            'guard' => 'api',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function validation_prevents_duplicate_role_names()
    {
        Role::create(['name' => 'Existing Role', 'guard_name' => 'api']);

        $response = $this->postJson('/api/superadmin/roles', [
            'name' => 'Existing Role',
            'guard' => 'api',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
