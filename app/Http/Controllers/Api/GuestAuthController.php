<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use App\Http\Controllers\Controller;
use App\Models\GuestUser;
use App\Models\WebRefreshSession;
use App\Services\Auth\WebRefreshSessionService;
use App\Services\Guest\BookingGuestLinkingService;
use App\Services\Guest\GuestAccessTokenService;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GuestAuthController extends Controller
{
    public function __construct(
        private readonly GuestMagicLinkService $guestMagicLinkService,
        private readonly BookingGuestLinkingService $bookingGuestLinkingService,
        private readonly GuestAccessTokenService $guestAccessTokenService,
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
        private readonly WebRefreshSessionService $webRefreshSessionService,
    ) {}

    public function requestLink(Request $request): JsonResponse
    {
        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['email'],
        ), [
            'email' => ['required', 'email'],
        ])->validate();

        $this->guestMagicLinkService->issue(
            $validated['email'],
            $this->currentTenantId(),
            rtrim($request->getSchemeAndHttpHost(), '/').'/guest/magic',
        );

        return response()->json([
            'sent' => true,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'token' => ['required', 'string'],
        ])->validate();

        $tenantId = $this->currentTenantId();
        $guestUser = $this->guestMagicLinkService->verify($validated['token'], $tenantId);
        $this->bookingGuestLinkingService->linkByEmail($guestUser, $tenantId);
        [$refreshSession, $refreshCookie] = $this->webRefreshSessionService->issueGuest($guestUser, $request, $tenantId);
        $accessToken = $this->guestAccessTokenService->issue($guestUser, $tenantId, $refreshSession);

        return $this->tokenResponse([
            'guest' => $this->guestPayload($guestUser),
            'token' => $accessToken,
        ])->withCookie($refreshCookie);
    }

    public function session(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId();
        $refreshSession = $this->webRefreshSessionService->resolveGuestFromRequest($request, $tenantId);

        if (! $refreshSession instanceof WebRefreshSession) {
            return $this->emptySessionResponse($request);
        }

        $guestUser = $refreshSession->guestUser;

        if (! $guestUser instanceof GuestUser) {
            $this->webRefreshSessionService->revoke($refreshSession);

            return $this->emptySessionResponse($request);
        }

        [$rotatedSession, $refreshCookie] = $this->webRefreshSessionService->rotateGuest($refreshSession, $request);
        $accessToken = $this->guestAccessTokenService->issue($guestUser, $tenantId, $rotatedSession);

        return $this->tokenResponse([
            'guest' => $this->guestPayload($guestUser),
            'token' => $accessToken,
        ])->withCookie($refreshCookie);
    }

    public function logout(Request $request): JsonResponse
    {
        $refreshSession = $request->attributes->get('guest_refresh_session');

        if (! $refreshSession instanceof WebRefreshSession) {
            return $this->unauthenticatedResponse($request);
        }

        $this->webRefreshSessionService->revoke($refreshSession);

        return response()->json([
            'message' => __('Successfully logged out'),
        ])->withCookie($this->webRefreshSessionService->expireGuestCookie($request));
    }

    private function currentTenantId(): string
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        return (string) tenancy()->tenant->id;
    }

    /**
     * @return array{id: int, email: string, name: string|null}
     */
    private function guestPayload(GuestUser $guestUser): array
    {
        return [
            'id' => $guestUser->id,
            'email' => $guestUser->email,
            'name' => $guestUser->name,
        ];
    }

    private function emptySessionResponse(Request $request): JsonResponse
    {
        return response()->json([
            'guest' => null,
            'token' => null,
        ])->withCookie($this->webRefreshSessionService->expireGuestCookie($request));
    }

    private function unauthenticatedResponse(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401)->withCookie($this->webRefreshSessionService->expireGuestCookie($request));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function tokenResponse(array $payload, int $status = 200): JsonResponse
    {
        return response()
            ->json($payload, $status)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }
}
