<?php

declare(strict_types=1);

namespace App\Services\Guest;

use App\Models\GuestUser;
use App\Models\WebRefreshSession;
use Illuminate\Http\Request;

class GuestSessionResolver
{
    public function __construct(
        private readonly GuestAccessTokenService $guestAccessTokenService,
    ) {}

    /**
     * @return array{guestUser: GuestUser, session: WebRefreshSession}|null
     */
    public function resolve(Request $request): ?array
    {
        $guestUser = $request->attributes->get('guest_user');
        $session = $request->attributes->get('guest_refresh_session');

        if ($guestUser instanceof GuestUser && $session instanceof WebRefreshSession) {
            return [
                'guestUser' => $guestUser,
                'session' => $session,
            ];
        }

        if (! tenancy()->initialized || ! tenancy()->tenant) {
            return null;
        }

        $bearerToken = (string) $request->bearerToken();

        if ($bearerToken === '') {
            return null;
        }

        $tenantId = (string) tenancy()->tenant->id;
        $payload = $this->guestAccessTokenService->verify($bearerToken, $tenantId);

        if ($payload === null) {
            return null;
        }

        $session = WebRefreshSession::query()
            ->with('guestUser')
            ->whereKey($payload['session_id'])
            ->where('guest_user_id', $payload['guest_user_id'])
            ->where('tenant_id', $tenantId)
            ->where('host', $request->getHost())
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $session instanceof WebRefreshSession) {
            return null;
        }

        $guestUser = $session->guestUser;

        if (! $guestUser instanceof GuestUser) {
            return null;
        }

        return [
            'guestUser' => $guestUser,
            'session' => $session,
        ];
    }
}
