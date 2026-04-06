<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\TenantAddon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate API routes behind a tenant add-on feature flag.
 *
 * Usage in routes:
 *   Route::get('...', [...])
 *       ->middleware('addon:booking');
 *
 * Returns 403 with a structured JSON body if the tenant does not have
 * the add-on active, so the frontend can detect it and show an upgrade prompt.
 */
class EnsureAddon
{
    public function handle(Request $request, Closure $next, string $featureFlag): Response
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        $tenantId = (string) tenancy()->tenant->id;

        $hasAddon = TenantAddon::query()
            ->forTenant($tenantId)
            ->active()
            ->whereHas('addon', fn ($q) => $q->where('feature_flag', $featureFlag))
            ->exists();

        if (! $hasAddon) {
            return response()->json([
                'message'         => 'This feature requires the ' . $featureFlag . ' add-on.',
                'addon_required'  => $featureFlag,
            ], 403);
        }

        return $next($request);
    }
}
