<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\Addon;
use App\Models\GuestUser;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Models\WebRefreshSession;
use App\Notifications\Guest\GuestMagicLinkNotification;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantGuestAuthTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = TestUsers::tenant('tenant-one');
    }

    private function tenantUrl(string $path): string
    {
        $domain = $this->tenant->domains()->first()?->domain ?? 'tenant-one.byteforge.se';

        return "http://{$domain}{$path}";
    }

    private function tenantHost(): string
    {
        return $this->tenant->domains()->first()?->domain ?? 'tenant-one.byteforge.se';
    }

    private function activateBookingAddon(): void
    {
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'booking'],
            [
                'name' => 'Booking',
                'description' => 'Booking system',
                'stripe_price_id' => 'price_booking_placeholder',
                'price_monthly' => 4900,
                'currency' => 'SEK',
                'feature_flag' => 'booking',
                'is_active' => true,
                'sort_order' => 10,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $this->tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null],
        );
    }

    private function deactivateBookingAddon(): void
    {
        $row = TenantAddon::query()
            ->where('tenant_id', (string) $this->tenant->id)
            ->whereHas('addon', fn ($query) => $query->where('feature_flag', 'booking'))
            ->first();

        if (! $row instanceof TenantAddon) {
            return;
        }

        $row->deactivated_at = now();
        $row->save();
    }

    private function guestRefreshCookieFromResponse(TestResponse $response): ?Cookie
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === config('guest_auth.refresh_cookie_name')) {
                return $cookie;
            }
        }

        return null;
    }

    #[Test]
    public function request_link_sends_guest_magic_link_for_booking_enabled_tenant(): void
    {
        Notification::fake();
        $this->activateBookingAddon();

        $response = $this->postJson($this->tenantUrl('/api/guest-auth/request-link'), [
            'email' => "  guest.portal@example.com\t ",
        ]);

        $response->assertOk()
            ->assertJsonPath('sent', true);

        $guestUser = GuestUser::query()->where('email', 'guest.portal@example.com')->firstOrFail();

        Notification::assertSentTo(
            $guestUser,
            GuestMagicLinkNotification::class,
            function (GuestMagicLinkNotification $notification) {
                return str_starts_with($notification->magicLink, $this->tenantUrl('/guest/magic/'));
            }
        );
    }

    #[Test]
    public function request_link_is_rejected_when_booking_addon_is_inactive(): void
    {
        $this->deactivateBookingAddon();

        $this->postJson($this->tenantUrl('/api/guest-auth/request-link'), [
            'email' => 'guest.portal@example.com',
        ])->assertForbidden();
    }

    #[Test]
    public function verify_creates_guest_session_and_returns_guest_access_token(): void
    {
        $this->activateBookingAddon();

        $result = app(GuestMagicLinkService::class)->issue(
            'guest.verify@example.com',
            (string) $this->tenant->id,
            $this->tenantUrl('/guest/magic'),
        );

        $response = $this->postJson($this->tenantUrl('/api/guest-auth/verify'), [
            'token' => $result['plainToken'],
        ]);

        $response->assertOk()
            ->assertJsonPath('guest.email', 'guest.verify@example.com');

        $refreshCookie = $this->guestRefreshCookieFromResponse($response);
        $this->assertNotNull($refreshCookie);
        $this->assertTrue($refreshCookie->isHttpOnly());

        $this->assertDatabaseHas('web_refresh_sessions', [
            'user_id' => null,
            'guest_user_id' => $result['guestUser']->id,
            'tenant_id' => (string) $this->tenant->id,
            'host' => $this->tenantHost(),
            'revoked_at' => null,
        ]);
    }

    #[Test]
    public function guest_session_bootstrap_rotates_the_refresh_session(): void
    {
        $this->activateBookingAddon();

        $verifyResponse = $this->postJson($this->tenantUrl('/api/guest-auth/verify'), [
            'token' => app(GuestMagicLinkService::class)->issue(
                'guest.session@example.com',
                (string) $this->tenant->id,
                $this->tenantUrl('/guest/magic'),
            )['plainToken'],
        ]);

        $verifyResponse->assertOk();

        $originalCookie = $this->guestRefreshCookieFromResponse($verifyResponse);
        $this->assertNotNull($originalCookie);

        $originalSession = WebRefreshSession::query()->latest('id')->firstOrFail();

        $sessionResponse = $this->call(
            'GET',
            '/api/guest-auth/session',
            [],
            [$originalCookie->getName() => (string) $originalCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->tenantHost(),
            ],
        );

        $sessionResponse->assertOk()
            ->assertJsonPath('guest.email', 'guest.session@example.com');

        $rotatedCookie = $this->guestRefreshCookieFromResponse($sessionResponse);
        $this->assertNotNull($rotatedCookie);
        $this->assertNotSame($originalCookie->getValue(), $rotatedCookie->getValue());

        $originalSession->refresh();
        $this->assertNotNull($originalSession->revoked_at);

        $rotatedSession = WebRefreshSession::query()->latest('id')->firstOrFail();
        $this->assertSame($originalSession->id, $rotatedSession->rotated_from_id);
    }

    #[Test]
    public function guest_can_logout_with_valid_guest_bearer_token(): void
    {
        $this->activateBookingAddon();

        $verifyResponse = $this->postJson($this->tenantUrl('/api/guest-auth/verify'), [
            'token' => app(GuestMagicLinkService::class)->issue(
                'guest.logout@example.com',
                (string) $this->tenant->id,
                $this->tenantUrl('/guest/magic'),
            )['plainToken'],
        ]);

        $verifyResponse->assertOk();

        $refreshCookie = $this->guestRefreshCookieFromResponse($verifyResponse);
        $this->assertNotNull($refreshCookie);

        $session = WebRefreshSession::query()->latest('id')->firstOrFail();

        $response = $this->call(
            'POST',
            '/api/guest-auth/logout',
            [],
            [$refreshCookie->getName() => (string) $refreshCookie->getValue()],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => $this->tenantHost(),
                'HTTP_AUTHORIZATION' => 'Bearer '.(string) $verifyResponse->json('token'),
            ],
            json_encode([], JSON_THROW_ON_ERROR),
        );

        $response->assertOk();

        $session->refresh();
        $this->assertNotNull($session->revoked_at);
    }

    #[Test]
    public function guest_logout_rejects_invalid_bearer_tokens(): void
    {
        $this->activateBookingAddon();

        $this->withHeader('Authorization', 'Bearer invalid-guest-token')
            ->postJson($this->tenantUrl('/api/guest-auth/logout'))
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    #[Test]
    public function guest_session_returns_empty_payload_when_no_refresh_session_exists(): void
    {
        $this->activateBookingAddon();

        $this->getJson($this->tenantUrl('/api/guest-auth/session'))
            ->assertOk()
            ->assertJson([
                'guest' => null,
                'token' => null,
            ]);
    }
}
