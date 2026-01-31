<?php

namespace Tests\Central\Feature\Api;

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Tests for Central API Authentication Routes.
 *
 * Uses seeded test users that already exist in the database.
 */
#[Group('central')]
#[Group('api')]
#[Group('auth')]
class AuthApiTest extends TestCase
{
    #[Test]
    public function central_api_login_works_with_seeded_user(): void
    {
        // Use the seeded superadmin user (password is 'password')
        $response = $this->postJson('/api/auth/login', [
            'email' => 'superadmin@byteforge.se',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user', 'token']);
    }

    #[Test]
    public function central_api_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'superadmin@byteforge.se',
            'password' => 'wrong-password',
        ]);

        // Laravel returns 422 validation error for credential failures
        $response->assertStatus(422)
            ->assertJsonPath('message', 'The provided credentials are incorrect.');
    }

    #[Test]
    public function central_api_logout_works_with_real_token(): void
    {
        // First login to get a real token
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'superadmin@byteforge.se',
            'password' => 'password',
        ]);

        $token = $loginResponse->json('token');

        // Now logout with that token
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $response->assertOk()
            ->assertJson(['message' => 'Successfully logged out']);
    }

    #[Test]
    public function central_api_user_endpoint_requires_authentication(): void
    {
        $response = $this->getJson('/api/auth/user');

        $response->assertUnauthorized();
    }

    #[Test]
    public function central_api_user_endpoint_returns_authenticated_user(): void
    {
        $response = $this->actingAsSuperadmin()
            ->getJson('/api/auth/user');

        $response->assertOk()
            ->assertJsonStructure(['id', 'name', 'email'])
            ->assertJsonFragment(['email' => 'superadmin@byteforge.se']);
    }

    #[Test]
    public function superadmin_can_access_protected_routes(): void
    {
        $response = $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/pages');

        $response->assertOk();
    }

    #[Test]
    public function admin_can_access_pages_with_view_permission(): void
    {
        // Admin has pages.view permission
        $response = $this->actingAsCentralAdmin()
            ->getJson('/api/superadmin/pages');

        $response->assertOk();
    }

    #[Test]
    public function viewer_cannot_manage_users(): void
    {
        // Viewer can VIEW but NOT manage/create users
        $response = $this->actingAsCentralViewer()
            ->postJson('/api/superadmin/users', [
                'name' => 'Test User',
                'email' => 'test-cannot-create@example.com',
                'password' => 'password123',
            ]);

        $response->assertForbidden();
    }

    #[Test]
    public function unauthenticated_user_cannot_access_superadmin(): void
    {
        $response = $this->getJson('/api/superadmin/pages');

        $response->assertUnauthorized();
    }
}
