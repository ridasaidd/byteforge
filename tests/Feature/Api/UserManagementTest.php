<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Passport\Passport;
use Tests\TestCase;
use Illuminate\Support\Facades\Hash;

class UserManagementTest extends TestCase
{
    use DatabaseTransactions;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        // Use seeded superadmin user (from TestFixturesSeeder)
        $this->superadmin = User::where('email', 'superadmin@byteforge.se')->first();
    }

    public function test_can_list_users(): void
    {
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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
        Passport::actingAs($this->superadmin);

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

    public function test_requires_superadmin_role(): void
    {
        // Regular user without superadmin role - should get 403
        $regularUser = User::factory()->create();
        $response = $this->actingAs($regularUser, 'api')->getJson('/api/superadmin/users');
        $response->assertStatus(403);
    }
}
