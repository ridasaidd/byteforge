<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Guest\GuestSessionResolver;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateGuest
{
    public function __construct(
        private readonly GuestSessionResolver $guestSessionResolver,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            return response()->json([
                'message' => 'Tenant context is required.',
            ], 403);
        }

        $resolved = $this->guestSessionResolver->resolve($request);

        if ($resolved === null) {
            return $this->unauthenticated();
        }

        $guestUser = $resolved['guestUser'];
        $session = $resolved['session'];

        $request->attributes->set('guest_user', $guestUser);
        $request->attributes->set('guest_refresh_session', $session);
        app()->instance('guest_user', $guestUser);

        return $next($request);
    }

    private function unauthenticated(): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }
}
