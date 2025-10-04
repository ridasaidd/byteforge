<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperadminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Only users with type='superadmin' can access central domain routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($request->user()->type !== 'superadmin') {
            return response()->json([
                'message' => 'Forbidden. Superadmin access required.',
            ], 403);
        }

        return $next($request);
    }
}
