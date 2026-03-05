<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{

    public function test_can_list_users(): void
    {

        User::factory()->count(3)->create();

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'roles', 'permissions', 'created_at', 'updated_at'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_can_create_user(): void
    {

        $data = [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ];

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/users', $data);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'email', 'roles', 'permissions', 'created_at', 'updated_at'],
            ])
            ->assertJson([
                'data' => [
                    'name' => 'New User',
                    'email' => 'newuser@example.com',
                ],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
    }

    public function test_cannot_create_user_without_name(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/users', [
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_create_user_without_email(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/users', [
            'name' => 'Test User',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_create_user_with_duplicate_email(): void
    {

        User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/users', [
            'name' => 'New User',
            'email' => 'existing@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_cannot_create_user_with_mismatched_password(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_can_show_single_user(): void
    {

        $user = User::factory()->create(['name' => 'Test User']);

        $response = $this->actingAsSuperadmin()->getJson("/api/superadmin/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $user->id,
                    'name' => 'Test User',
                    'email' => $user->email,
                ],
            ]);
    }

    public function test_can_update_user(): void
    {

        $user = User::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAsSuperadmin()->putJson("/api/superadmin/users/{$user->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'New Name',
                ],
            ]);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name']);
    }

    public function test_can_update_user_password(): void
    {

        $user = User::factory()->create();

        $response = $this->actingAsSuperadmin()->putJson("/api/superadmin/users/{$user->id}", [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200);

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password));
    }

    public function test_can_delete_user(): void
    {

        $user = User::factory()->create();

        $response = $this->actingAsSuperadmin()->deleteJson("/api/superadmin/users/{$user->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'User deleted successfully']);

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_requires_authentication(): void
    {
        // No authentication - should get 401
        $response = $this->getJson('/api/superadmin/users');
        $response->assertStatus(401);
    }

    public function test_requires_manage_users_permission(): void
    {
        // User with no permissions should be rejected
        $user = \App\Models\User::factory()->create();
        $response = $this->actingAs($user, 'api')->postJson('/api/superadmin/users', [
            'name' => 'Test',
            'email' => 'forbidden@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $response->assertStatus(403);
    }
}
