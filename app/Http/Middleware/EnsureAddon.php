<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Pennant\Feature;
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
    public function handle(Request $request, Closure $next, string ...$featureFlags): Response
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        $featureFlags = array_values(array_filter($featureFlags, static fn (string $flag): bool => $flag !== ''));

        if ($featureFlags === []) {
            abort(500, 'At least one add-on feature flag is required.');
        }

        $tenantFeatures = Feature::for(tenancy()->tenant);

        foreach ($featureFlags as $featureFlag) {
            if ($tenantFeatures->active($featureFlag)) {
                return $next($request);
            }
        }

        if (count($featureFlags) === 1) {
            return response()->json([
                'message' => 'This feature requires the ' . $featureFlags[0] . ' add-on.',
                'addon_required' => $featureFlags[0],
            ], 403);
        }

        return response()->json([
            'message' => 'This feature requires one of the following add-ons: ' . implode(', ', $featureFlags) . '.',
            'addon_required_any' => $featureFlags,
        ], 403);
    }
}
