<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Membership;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Role;

class UserManagementTest extends TestCase
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

    public function test_superadmin_can_list_all_users()
    {
        User::factory()->count(3)->create(['type' => 'tenant_user']);

        $response = $this->getJson('/api/superadmin/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'type', 'roles', 'memberships_count'],
                ],
            ])
            ->assertJsonCount(4, 'data'); // 3 + superadmin
    }

    public function test_superadmin_can_view_single_user()
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $response = $this->getJson("/api/superadmin/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $user->id,
                    'name' => 'Test User',
                    'email' => 'test@example.com',
                ],
            ]);
    }

    public function test_superadmin_can_create_user()
    {
        $response = $this->postJson('/api/superadmin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'type' => 'tenant_user',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'User created successfully',
                'data' => [
                    'name' => 'New User',
                    'email' => 'newuser@example.com',
                    'type' => 'tenant_user',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
        ]);
    }

    public function test_superadmin_can_create_user_with_roles()
    {
        Role::create(['name' => 'Editor', 'guard_name' => 'api']);
        Role::create(['name' => 'Viewer', 'guard_name' => 'api']);

        $response = $this->postJson('/api/superadmin/users', [
            'name' => 'User With Roles',
            'email' => 'withroles@example.com',
            'password' => 'password123',
            'type' => 'tenant_user',
            'roles' => ['Editor', 'Viewer'],
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'withroles@example.com')->first();
        $this->assertTrue($user->hasRole('Editor'));
        $this->assertTrue($user->hasRole('Viewer'));
    }

    public function test_superadmin_can_update_user()
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
        ]);

        $response = $this->putJson("/api/superadmin/users/{$user->id}", [
            'name' => 'New Name',
            'email' => 'new@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'User updated successfully',
                'data' => [
                    'name' => 'New Name',
                    'email' => 'new@example.com',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'email' => 'new@example.com',
        ]);
    }

    public function test_superadmin_can_update_user_password()
    {
        $user = User::factory()->create();
        $oldPassword = $user->password;

        $response = $this->putJson("/api/superadmin/users/{$user->id}", [
            'password' => 'newpassword123',
        ]);

        $response->assertStatus(200);

        $user->refresh();
        $this->assertNotEquals($oldPassword, $user->password);
    }

    public function test_superadmin_can_sync_user_roles()
    {
        $user = User::factory()->create();
        Role::create(['name' => 'Editor', 'guard_name' => 'api']);
        Role::create(['name' => 'Admin', 'guard_name' => 'api']);
        Role::create(['name' => 'Viewer', 'guard_name' => 'api']);

        $user->assignRole('Editor');

        $response = $this->putJson("/api/superadmin/users/{$user->id}", [
            'roles' => ['Admin', 'Viewer'],
        ]);

        $response->assertStatus(200);

        $user->refresh();
        $this->assertFalse($user->hasRole('Editor'));
        $this->assertTrue($user->hasRole('Admin'));
        $this->assertTrue($user->hasRole('Viewer'));
    }

    public function test_superadmin_can_delete_user()
    {
        $user = User::factory()->create();

        $response = $this->deleteJson("/api/superadmin/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'User deleted successfully',
            ]);

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
        ]);
    }

    public function test_deleting_user_removes_all_memberships()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();

        Membership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => 'member',
            'status' => 'active',
        ]);

        $this->deleteJson("/api/superadmin/users/{$user->id}");

        $this->assertDatabaseMissing('memberships', [
            'user_id' => $user->id,
        ]);
    }

    public function test_deleting_user_removes_all_role_assignments()
    {
        $user = User::factory()->create();
        Role::create(['name' => 'Editor', 'guard_name' => 'api']);
        $user->assignRole('Editor');

        $this->deleteJson("/api/superadmin/users/{$user->id}");

        $this->assertDatabaseMissing('model_has_roles', [
            'model_id' => $user->id,
            'model_type' => User::class,
        ]);
    }

    public function test_non_superadmin_cannot_create_user()
    {
        $normalUser = User::factory()->create(['type' => 'tenant_user']);
        Passport::actingAs($normalUser);

        $response = $this->postJson('/api/superadmin/users', [
            'name' => 'Unauthorized User',
            'email' => 'unauthorized@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403);
    }

    public function test_validation_prevents_duplicate_email()
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson('/api/superadmin/users', [
            'name' => 'New User',
            'email' => 'existing@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_validation_requires_strong_password()
    {
        $response = $this->postJson('/api/superadmin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'weak',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
