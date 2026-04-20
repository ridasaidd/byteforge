<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\TenantSupportAccessGrant;
use App\Services\TenantSupportAccessService;
use App\Models\WebRefreshSession;
use Illuminate\Support\Collection;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\Support\TestUsers;
use Tests\TestCase;

/**
 * Tests for the tenant-domain authentication endpoints.
 *
 * Covers: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/user
 * and cross-tenant access enforcement.
 */
class TenantAuthTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    private function tenantHost(string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);

        return $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";
    }

    private function refreshCookieFromResponse(TestResponse $response): ?Cookie
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === config('auth_sessions.refresh_cookie_name')) {
                return $cookie;
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    private function userPermissionNames(TestResponse $response): array
    {
        $roles = collect($response->json('user.roles', []));
        $rolePermissions = $roles
            ->flatMap(fn (array $role) => $role['permissions'] ?? [])
            ->pluck('name');
        $directPermissions = collect($response->json('user.permissions', []))->pluck('name');

        return $rolePermissions
            ->merge($directPermissions)
            ->unique()
            ->values()
            ->all();
    }

    #[Test]
    public function tenant_login_returns_token_for_valid_credentials(): void
    {
        $tenant = TestUsers::tenant('tenant-one');

        $response = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), [
            'email' => 'owner@tenant-one.byteforge.se',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user', 'token'])
            ->assertJsonPath('user.email', 'owner@tenant-one.byteforge.se');

        $refreshCookie = $this->refreshCookieFromResponse($response);

        $this->assertNotNull($refreshCookie);
        $this->assertTrue($refreshCookie->isHttpOnly());
        $this->assertDatabaseHas('web_refresh_sessions', [
            'user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'tenant_id' => (string) $tenant->id,
            'host' => $this->tenantHost('tenant-one'),
            'revoked_at' => null,
        ]);
    }

    #[Test]
    public function tenant_login_returns_422_for_wrong_password(): void
    {
        $response = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), [
            'email' => 'owner@tenant-one.byteforge.se',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function tenant_login_requires_email_and_password(): void
    {
        $response = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    // =========================================================================
    // AUTHENTICATED USER ENDPOINT
    // =========================================================================

    #[Test]
    public function authenticated_user_endpoint_returns_user_data(): void
    {
        $user = TestUsers::tenantOwner('tenant-one');

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/auth/user', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('email', $user->email);
    }

    #[Test]
    public function tenant_editor_can_fetch_own_user_data(): void
    {
        $user = TestUsers::tenantEditor('tenant-one');

        $response = $this->actingAsTenantEditor('tenant-one')
            ->getJson($this->tenantUrl('/api/auth/user', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('email', $user->email);
    }

    // =========================================================================
    // LOGOUT
    // =========================================================================

    #[Test]
    public function tenant_owner_can_logout(): void
    {
        $loginResponse = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), [
            'email' => 'owner@tenant-one.byteforge.se',
            'password' => 'password',
        ]);

        $token = (string) $loginResponse->json('token');
        $refreshCookie = $this->refreshCookieFromResponse($loginResponse);

        $this->assertNotNull($refreshCookie);

        $session = WebRefreshSession::query()->latest('id')->firstOrFail();

        $response = $this->call(
            'POST',
            '/api/auth/logout',
            [],
            [$refreshCookie->getName() => (string) $refreshCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->tenantHost('tenant-one'),
                'HTTP_AUTHORIZATION' => "Bearer {$token}",
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $response->assertOk();

        $session->refresh();
        $this->assertNotNull($session->revoked_at);
    }

    #[Test]
    public function tenant_refresh_can_rotate_session_from_refresh_cookie_without_bearer(): void
    {
        $loginResponse = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), [
            'email' => 'owner@tenant-one.byteforge.se',
            'password' => 'password',
        ]);

        $loginResponse->assertOk();

        $refreshCookie = $this->refreshCookieFromResponse($loginResponse);
        $this->assertNotNull($refreshCookie);

        $originalSession = WebRefreshSession::query()->latest('id')->firstOrFail();

        $refreshResponse = $this->call(
            'POST',
            '/api/auth/refresh',
            [],
            [$refreshCookie->getName() => (string) $refreshCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->tenantHost('tenant-one'),
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $refreshResponse->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.email', 'owner@tenant-one.byteforge.se');

        $rotatedCookie = $this->refreshCookieFromResponse($refreshResponse);
        $this->assertNotNull($rotatedCookie);
        $this->assertNotSame($refreshCookie->getValue(), $rotatedCookie->getValue());

        $originalSession->refresh();
        $this->assertNotNull($originalSession->revoked_at);

        $rotatedSession = WebRefreshSession::query()->latest('id')->firstOrFail();
        $this->assertSame($originalSession->id, $rotatedSession->rotated_from_id);
    }

    #[Test]
    public function tenant_refresh_rejects_bearer_only_requests_without_refresh_cookie(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/auth/refresh', 'tenant-one'));

        $response->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    // =========================================================================
    // CROSS-TENANT ACCESS ENFORCEMENT
    // =========================================================================

    #[Test]
    public function member_of_tenant_one_cannot_access_tenant_two_auth_endpoint(): void
    {
        // owner@tenant-one is NOT a member of tenant-two
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/auth/user', 'tenant-two'));

        $response->assertForbidden();
    }

    #[Test]
    public function central_user_is_rejected_on_tenant_domain(): void
    {
        // Central superadmin has no tenant membership at all
        $response = $this->actingAsSuperadmin()
            ->getJson($this->tenantUrl('/api/auth/user', 'tenant-one'));

        $response->assertForbidden();
    }

    #[Test]
    public function central_support_user_can_log_in_to_tenant_with_active_support_access(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $supportUser = TestUsers::centralSupport();

        app(TenantSupportAccessService::class)->grant(
            $tenant,
            $supportUser,
            TestUsers::centralAdmin(),
            'Investigate tenant issue',
            24,
        );

        $response = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), [
            'email' => $supportUser->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', $supportUser->email);

        $roles = collect($response->json('user.roles', []))->pluck('name')->all();
        $permissions = $this->userPermissionNames($response);

        $this->assertSame(['platform_support'], $roles);
        $this->assertContains('pages.view', $permissions);
        $this->assertContains('navigation.view', $permissions);
        $this->assertContains('themes.view', $permissions);
        $this->assertContains('bookings.view', $permissions);
        $this->assertNotContains('users.view', $permissions);
        $this->assertNotContains('payments.view', $permissions);
        $this->assertNotContains('pages.edit', $permissions);
        $this->assertNotContains('navigation.edit', $permissions);
        $this->assertNotContains('roles.manage', $permissions);

        $this->assertDatabaseHas('web_refresh_sessions', [
            'user_id' => $supportUser->id,
            'tenant_id' => (string) $tenant->id,
            'host' => $this->tenantHost('tenant-one'),
            'revoked_at' => null,
        ]);
    }

    #[Test]
    public function central_support_user_has_read_only_tenant_api_access_with_active_support_grant(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $supportUser = TestUsers::centralSupport();

        app(TenantSupportAccessService::class)->grant(
            $tenant,
            $supportUser,
            TestUsers::centralAdmin(),
            'Read-only support inspection',
            24,
        );

        $this->actingAs($supportUser, 'api')
            ->getJson($this->tenantUrl('/api/pages', 'tenant-one'))
            ->assertOk();

        $this->actingAs($supportUser, 'api')
            ->getJson($this->tenantUrl('/api/navigations', 'tenant-one'))
            ->assertOk();

        $this->actingAs($supportUser, 'api')
            ->getJson($this->tenantUrl('/api/themes', 'tenant-one'))
            ->assertOk();

        $this->actingAs($supportUser, 'api')
            ->getJson($this->tenantUrl('/api/booking/services', 'tenant-one'))
            ->assertOk();

        $this->actingAs($supportUser, 'api')
            ->getJson($this->tenantUrl('/api/users', 'tenant-one'))
            ->assertForbidden();

        $this->actingAs($supportUser, 'api')
            ->getJson($this->tenantUrl('/api/payment-providers', 'tenant-one'))
            ->assertForbidden();

        $this->actingAs($supportUser, 'api')
            ->postJson($this->tenantUrl('/api/pages', 'tenant-one'), [
                'title' => 'Support Access Should Not Create',
                'slug' => 'support-access-should-not-create',
                'page_type' => 'general',
                'status' => 'draft',
                'puck_data' => [],
            ])
            ->assertForbidden();
    }

    #[Test]
    public function central_support_user_cannot_log_in_after_support_access_expires(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $supportUser = TestUsers::centralSupport();

        $grant = app(TenantSupportAccessService::class)->grant(
            $tenant,
            $supportUser,
            TestUsers::centralAdmin(),
            'Temporary investigation',
            1,
        );

        $grant->membership()->update(['expires_at' => now()->subMinute()]);
        $grant->update(['expires_at' => now()->subMinute()]);

        $response = $this->postJson($this->tenantUrl('/api/auth/login', 'tenant-one'), [
            'email' => $supportUser->email,
            'password' => 'password',
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseHas('memberships', [
            'user_id' => $supportUser->id,
            'tenant_id' => $tenant->id,
            'status' => 'expired',
            'source' => 'support_access',
        ]);

        $this->assertDatabaseHas('tenant_support_access_grants', [
            'id' => $grant->id,
            'status' => 'expired',
        ]);
    }
}
