<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\WebRefreshSession;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class WebRefreshSessionService
{
    public function issue(User $user, Request $request, ?string $tenantId = null, ?int $rotatedFromId = null): array
    {
        $plainToken = Str::random(80);

        $session = WebRefreshSession::query()->create([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'host' => $request->getHost(),
            'token_hash' => hash('sha256', $plainToken),
            'user_agent' => Str::limit((string) $request->userAgent(), 65535, ''),
            'ip_address' => $request->ip(),
            'last_used_at' => now(),
            'expires_at' => $this->expiresAt(),
            'rotated_from_id' => $rotatedFromId,
        ]);

        return [$session, $this->makeCookie($plainToken, $request)];
    }

    public function resolveFromRequest(Request $request, ?string $tenantId = null): ?WebRefreshSession
    {
        $plainToken = (string) $request->cookie($this->cookieName(), '');

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

    public function rotate(WebRefreshSession $session, Request $request): array
    {
        $session->forceFill([
            'last_used_at' => now(),
            'revoked_at' => now(),
        ])->save();

        return $this->issue($session->user, $request, $session->tenant_id, $session->id);
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
        return cookie(
            $this->cookieName(),
            '',
            -1,
            $this->cookiePath(),
            null,
            $this->shouldUseSecureCookies($request),
            true,
            false,
            $this->sameSite(),
        );
    }

    private function makeCookie(string $plainToken, Request $request): Cookie
    {
        return cookie(
            $this->cookieName(),
            $plainToken,
            $this->ttlMinutes(),
            $this->cookiePath(),
            null,
            $this->shouldUseSecureCookies($request),
            true,
            false,
            $this->sameSite(),
        );
    }

    private function expiresAt(): Carbon
    {
        return now()->addMinutes($this->ttlMinutes());
    }

    private function ttlMinutes(): int
    {
        return (int) config('auth_sessions.refresh_ttl_minutes', 20160);
    }

    private function cookieName(): string
    {
        return (string) config('auth_sessions.refresh_cookie_name', 'byteforge_refresh');
    }

    private function cookiePath(): string
    {
        return (string) config('auth_sessions.refresh_cookie_path', '/api/auth');
    }

    private function sameSite(): string
    {
        return (string) config('auth_sessions.refresh_cookie_same_site', 'lax');
    }

    private function shouldUseSecureCookies(Request $request): bool
    {
        return app()->environment('production') || $request->isSecure();
    }
}
