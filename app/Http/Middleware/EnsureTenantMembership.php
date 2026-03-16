<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\TenantRbacService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantMembership
{
    public function __construct(
        private readonly TenantRbacService $tenantRbac,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        $tenantId = (string) tenancy()->tenant->id;

        $isActiveMember = $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->exists();

        if (! $isActiveMember) {
            abort(403, 'You do not have access to this tenant.');
        }

        $membershipRole = $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->value('role');

        $this->tenantRbac->ensureUserRoleSynced($user, $tenantId, $membershipRole);

        return $next($request);
    }
}
