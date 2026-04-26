<?php

namespace App\Services\Auth;

use App\Models\GuestUser;
use App\Models\User;
use App\Models\WebRefreshSession;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Cookie;

class WebRefreshSessionService
{
    public function issue(User $user, Request $request, ?string $tenantId = null, ?int $rotatedFromId = null): array
    {
        return $this->issueForActor(
            request: $request,
            tenantId: $tenantId,
            actorAttributes: [
                'user_id' => $user->id,
                'guest_user_id' => null,
            ],
            rotatedFromId: $rotatedFromId,
            profile: $this->staffCookieProfile(),
        );
    }

    public function issueGuest(GuestUser $guestUser, Request $request, string $tenantId, ?int $rotatedFromId = null): array
    {
        return $this->issueForActor(
            request: $request,
            tenantId: $tenantId,
            actorAttributes: [
                'user_id' => null,
                'guest_user_id' => $guestUser->id,
            ],
            rotatedFromId: $rotatedFromId,
            profile: $this->guestCookieProfile(),
        );
    }

    public function resolveFromRequest(Request $request, ?string $tenantId = null): ?WebRefreshSession
    {
        return $this->resolveFromCookie($request, $tenantId, $this->staffCookieProfile());
    }

    public function resolveGuestFromRequest(Request $request, string $tenantId): ?WebRefreshSession
    {
        return $this->resolveFromCookie($request, $tenantId, $this->guestCookieProfile());
    }

    public function rotate(WebRefreshSession $session, Request $request): array
    {
        $user = $session->user;

        if (! $user instanceof User) {
            throw new InvalidArgumentException('Staff refresh session is missing its user actor.');
        }

        $this->revoke($session);

        return $this->issue($user, $request, $session->tenant_id, $session->id);
    }

    public function rotateGuest(WebRefreshSession $session, Request $request): array
    {
        $guestUser = $session->guestUser;

        if (! $guestUser instanceof GuestUser) {
            throw new InvalidArgumentException('Guest refresh session is missing its guest actor.');
        }

        if (! is_string($session->tenant_id) || $session->tenant_id === '') {
            throw new InvalidArgumentException('Guest refresh sessions require a tenant context.');
        }

        $this->revoke($session);

        return $this->issueGuest($guestUser, $request, $session->tenant_id, $session->id);
    }

    public function revoke(?WebRefreshSession $session): void
    {
        if (! $session || $session->revoked_at !== null) {
            return;
        }

        $session->forceFill([
            'revoked_at' => now(),
            'last_used_at' => now(),
        ])->save();
    }

    public function expireCookie(Request $request): Cookie
    {
        return $this->expireProfileCookie($request, $this->staffCookieProfile());
    }

    public function expireGuestCookie(Request $request): Cookie
    {
        return cookie(
            $this->guestCookieProfile()['name'],
            '',
            -1,
            $this->guestCookieProfile()['path'],
            null,
            $this->shouldUseSecureCookies($request),
            true,
            false,
            $this->guestCookieProfile()['same_site'],
        );
    }

    /**
     * @param  array{name: string, path: string, same_site: string, ttl_minutes: int}  $profile
     * @param  array{user_id: int|null, guest_user_id: int|null}  $actorAttributes
     * @return array{0: WebRefreshSession, 1: Cookie}
     */
    private function issueForActor(Request $request, ?string $tenantId, array $actorAttributes, ?int $rotatedFromId, array $profile): array
    {
        $plainToken = Str::random(80);

        $session = WebRefreshSession::query()->create([
            ...$actorAttributes,
            'tenant_id' => $tenantId,
            'host' => $request->getHost(),
            'token_hash' => hash('sha256', $plainToken),
            'user_agent' => Str::limit((string) $request->userAgent(), 65535, ''),
            'ip_address' => $request->ip(),
            'last_used_at' => now(),
            'expires_at' => $this->expiresAt($profile),
            'rotated_from_id' => $rotatedFromId,
        ]);

        return [$session, $this->makeCookie($plainToken, $request, $profile)];
    }

    /**
     * @param  array{name: string, path: string, same_site: string, ttl_minutes: int}  $profile
     */
    private function resolveFromCookie(Request $request, ?string $tenantId, array $profile): ?WebRefreshSession
    {
        $plainToken = (string) $request->cookie($profile['name'], '');

        if ($plainToken === '') {
            return null;
        }

        $session = WebRefreshSession::query()
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if (! $session) {
            return null;
        }

        if ($session->host !== $request->getHost()) {
            return null;
        }

        if ($session->tenant_id !== $tenantId) {
            return null;
        }

        if ($session->revoked_at !== null || $session->expires_at->isPast()) {
            return null;
        }

        return $session;
    }

    /**
     * @param  array{name: string, path: string, same_site: string, ttl_minutes: int}  $profile
     */
    private function makeCookie(string $plainToken, Request $request, array $profile): Cookie
    {
        return cookie(
            $profile['name'],
            $plainToken,
            $profile['ttl_minutes'],
            $profile['path'],
            null,
            $this->shouldUseSecureCookies($request),
            true,
            false,
            $profile['same_site'],
        );
    }

    /**
     * @param  array{name: string, path: string, same_site: string, ttl_minutes: int}  $profile
     */
    private function expireProfileCookie(Request $request, array $profile): Cookie
    {
        return cookie(
            $profile['name'],
            '',
            -1,
            $profile['path'],
            null,
            $this->shouldUseSecureCookies($request),
            true,
            false,
            $profile['same_site'],
        );
    }

    /**
     * @param  array{name: string, path: string, same_site: string, ttl_minutes: int}  $profile
     */
    private function expiresAt(array $profile): Carbon
    {
        return now()->addMinutes($profile['ttl_minutes']);
    }

    /**
     * @return array{name: string, path: string, same_site: string, ttl_minutes: int}
     */
    private function staffCookieProfile(): array
    {
        return [
            'name' => (string) config('auth_sessions.refresh_cookie_name', 'byteforge_refresh'),
            'path' => (string) config('auth_sessions.refresh_cookie_path', '/api/auth'),
            'same_site' => (string) config('auth_sessions.refresh_cookie_same_site', 'lax'),
            'ttl_minutes' => (int) config('auth_sessions.refresh_ttl_minutes', 20160),
        ];
    }

    /**
     * @return array{name: string, path: string, same_site: string, ttl_minutes: int}
     */
    private function guestCookieProfile(): array
    {
        return [
            'name' => (string) config('guest_auth.refresh_cookie_name', 'byteforge_guest_refresh'),
            'path' => (string) config('guest_auth.refresh_cookie_path', '/api/guest-auth'),
            'same_site' => (string) config('guest_auth.refresh_cookie_same_site', 'lax'),
            'ttl_minutes' => (int) config('guest_auth.refresh_ttl_minutes', 20160),
        ];
    }

    private function shouldUseSecureCookies(Request $request): bool
    {
        return app()->environment('production') || $request->isSecure();
    }
}
