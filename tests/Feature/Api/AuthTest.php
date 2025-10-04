<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function user_can_register()
    {
        $userData = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
        ];

        $response = $this->postJson('/api/auth/register', $userData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'user' => ['id', 'name', 'email', 'type'],
                    'token'
                ]);

        $this->assertDatabaseHas('users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'type' => 'customer',
        ]);
    }

    #[Test]
    public function user_can_login()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
                ->assertJsonStructure(['token']);
    }

    #[Test]
    public function user_can_logout()
    {
        $user = User::factory()->create();
        $tokenResult = $user->createToken('test-token');
        $token = $tokenResult->token;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
        ])->postJson('/api/auth/logout');

        $response->assertStatus(200)
                ->assertJson(['message' => 'Logged out successfully']);

        // Verify token is revoked
        $token->refresh();
        $this->assertTrue($token->revoked);
    }

    #[Test]
    public function user_can_refresh_token()
    {
        $user = User::factory()->create();
        $oldTokenResult = $user->createToken('old-token');
        $oldToken = $oldTokenResult->token;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $oldTokenResult->accessToken,
        ])->postJson('/api/auth/refresh');

        $response->assertStatus(200)
                ->assertJsonStructure(['token']);

        // Verify old token is revoked
        $oldToken->refresh();
        $this->assertTrue($oldToken->revoked);
    }
}
