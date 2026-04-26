<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureServiceToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $configuredToken = (string) config('services.internal.service_token', '');
        $providedToken = (string) ($request->header('X-Service-Token') ?: $request->bearerToken() ?: '');

        if ($configuredToken === '' || $providedToken === '' || ! hash_equals($configuredToken, $providedToken)) {
            return new JsonResponse([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return $next($request);
    }
}
