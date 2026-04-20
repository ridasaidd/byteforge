<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Membership;
use App\Services\TenantSupportAccessService;
use App\Services\TenantRbacService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantMembership
{
    public function __construct(
        private readonly TenantRbacService $tenantRbac,
        private readonly TenantSupportAccessService $tenantSupportAccess,
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

        $this->tenantSupportAccess->expireSupportAccessIfNeeded($user, $tenantId);

        $membership = $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if (! $membership instanceof Membership) {
            abort(403, 'You do not have access to this tenant.');
        }

        $membershipRole = $membership->role;

        $this->tenantRbac->ensureUserRoleSynced($user, $tenantId, $membershipRole);

        if ($membershipRole === TenantSupportAccessService::MEMBERSHIP_ROLE) {
            $this->tenantRbac->refreshTenantPermissionCache($tenantId);
        }

        return $next($request);
    }
}
