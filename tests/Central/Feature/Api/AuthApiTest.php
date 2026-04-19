<?php

namespace Tests\Central\Feature\Api;

use App\Models\WebRefreshSession;
use App\Models\User;
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
    private function centralHost(): string
    {
        return (string) (config('tenancy.central_domains')[0] ?? 'byteforge.se');
    }

    private function refreshCookieFromResponse(\Illuminate\Testing\TestResponse $response): ?\Symfony\Component\HttpFoundation\Cookie
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === config('auth_sessions.refresh_cookie_name')) {
                return $cookie;
            }
        }

        return null;
    }

    private function assertNoStoreHeaders(\Illuminate\Testing\TestResponse $response): void
    {
        $cacheControl = (string) $response->headers->get('Cache-Control', '');

        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('no-cache', $cacheControl);
        $this->assertStringContainsString('must-revalidate', $cacheControl);
        $this->assertStringContainsString('max-age=0', $cacheControl);
        $response->assertHeader('Pragma', 'no-cache');
    }

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

        $this->assertNoStoreHeaders($response);
        $refreshCookie = $this->refreshCookieFromResponse($response);

        $this->assertNotNull($refreshCookie);
        $this->assertTrue($refreshCookie->isHttpOnly());
        $this->assertSame('/api/auth', $refreshCookie->getPath());
        $this->assertDatabaseHas('web_refresh_sessions', [
            'user_id' => User::query()->where('email', 'superadmin@byteforge.se')->value('id'),
            'host' => 'byteforge.se',
            'tenant_id' => null,
            'revoked_at' => null,
        ]);
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
            ->assertJsonPath('message', trans('auth.failed'));
    }

    #[Test]
    public function central_api_login_normalizes_email_before_authentication(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => "  superadmin@byteforge.se\t ",
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user', 'token']);
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
            ->assertJsonStructure(['message']);

        $this->assertNotSame('', (string) $response->json('message'));
    }

    #[Test]
    public function central_api_refresh_returns_token_with_no_store_headers(): void
    {
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'superadmin@byteforge.se',
            'password' => 'password',
        ]);

        $refreshCookie = $this->refreshCookieFromResponse($loginResponse);

        $this->assertNotNull($refreshCookie);

        $response = $this->call(
            'POST',
            '/api/auth/refresh',
            [],
            [$refreshCookie->getName() => (string) $refreshCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->centralHost(),
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $response->assertOk()
            ->assertJsonStructure(['token']);

        $this->assertNoStoreHeaders($response);
    }

    #[Test]
    public function central_api_refresh_rejects_bearer_only_requests_without_refresh_cookie(): void
    {
        $response = $this->actingAsSuperadmin()
            ->postJson('/api/auth/refresh');

        $response->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    #[Test]
    public function central_api_refresh_can_rotate_session_from_refresh_cookie_without_bearer(): void
    {
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'superadmin@byteforge.se',
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $issuedCookie = $this->refreshCookieFromResponse($loginResponse);

        $this->assertNotNull($issuedCookie);

        $originalSession = WebRefreshSession::query()->latest('id')->firstOrFail();

        $refreshResponse = $this->call(
            'POST',
            '/api/auth/refresh',
            [],
            [$issuedCookie->getName() => (string) $issuedCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->centralHost(),
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $refreshResponse->assertOk()
            ->assertJsonStructure(['token', 'user']);

        $this->assertNoStoreHeaders($refreshResponse);

        $rotatedCookie = $this->refreshCookieFromResponse($refreshResponse);

        $this->assertNotNull($rotatedCookie);
        $this->assertNotSame($issuedCookie->getValue(), $rotatedCookie->getValue());

        $originalSession->refresh();
        $this->assertNotNull($originalSession->revoked_at);

        $rotatedSession = WebRefreshSession::query()->latest('id')->firstOrFail();
        $this->assertSame($originalSession->id, $rotatedSession->rotated_from_id);
        $this->assertNull($rotatedSession->revoked_at);
    }

    #[Test]
    public function central_api_logout_revokes_refresh_session_and_clears_cookie(): void
    {
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'superadmin@byteforge.se',
            'password' => 'password',
        ]);

        $token = (string) $loginResponse->json('token');
        $refreshCookie = $this->refreshCookieFromResponse($loginResponse);

        $this->assertNotNull($refreshCookie);

        $session = WebRefreshSession::query()->latest('id')->firstOrFail();

        $logoutResponse = $this->call(
            'POST',
            '/api/auth/logout',
            [],
            [$refreshCookie->getName() => (string) $refreshCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->centralHost(),
                'HTTP_AUTHORIZATION' => "Bearer {$token}",
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $logoutResponse->assertOk();

        $session->refresh();
        $this->assertNotNull($session->revoked_at);

        $expiredCookie = $this->refreshCookieFromResponse($logoutResponse);
        $this->assertNotNull($expiredCookie);
        $this->assertSame('', (string) $expiredCookie->getValue());
    }

    #[Test]
    public function central_api_refresh_rejects_invalid_refresh_cookie(): void
    {
        $response = $this->call(
            'POST',
            '/api/auth/refresh',
            [],
            [config('auth_sessions.refresh_cookie_name') => 'invalid-cookie-token'],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->centralHost(),
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $response->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
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
    public function authenticated_user_can_update_preferred_locale(): void
    {
        $response = $this->actingAsSuperadmin()
            ->patchJson('/api/auth/locale', [
                'locale' => 'sv',
            ]);

        $response->assertOk()
            ->assertJsonPath('locale', 'sv')
            ->assertJsonPath('message', trans('Locale updated successfully'));

        $user = User::query()->where('email', 'superadmin@byteforge.se')->firstOrFail();
        $this->assertSame('sv', $user->preferred_locale);
    }

    #[Test]
    public function authenticated_user_can_update_profile_with_normalized_fields(): void
    {
        $response = $this->actingAsSuperadmin()
            ->putJson('/api/auth/user', [
                'name' => "  Super\n Admin  ",
                'email' => "  superadmin@byteforge.se\t ",
            ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'Super Admin')
            ->assertJsonPath('user.email', 'superadmin@byteforge.se');

        $user = User::query()->where('email', 'superadmin@byteforge.se')->firstOrFail();
        $this->assertSame('Super Admin', $user->name);
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
