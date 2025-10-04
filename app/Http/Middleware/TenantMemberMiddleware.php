<?php

namespace App\Http\Middleware;

use App\Models\Membership;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMemberMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Ensures user has active membership in current tenant.
     * Super super admins (type='superadmin' with 'superadmin' role) bypass this check.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user = $request->user();
        $tenant = tenancy()->tenant;

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant context not initialized.',
            ], 500);
        }

        // Super super admin bypass (god mode)
        if ($user->type === 'superadmin' && $user->hasRole('superadmin')) {
            return $next($request);
        }

        // Check if user has active membership in this tenant
        $membership = Membership::where('user_id', $user->id)
            ->where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->first();

        if (!$membership) {
            return response()->json([
                'message' => 'Forbidden. You do not have access to this tenant.',
            ], 403);
        }

        // Store membership in request for easy access in controllers
        $request->merge(['_tenant_membership' => $membership]);

        return $next($request);
    }
}
