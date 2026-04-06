<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Models\TenantAddon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Exposes the active add-ons for the currently authenticated tenant.
 *
 * This is intentionally thin — it returns only the feature flags that are
 * active so the frontend can make gating decisions without hitting the
 * superadmin billing API.
 *
 * GET /api/addons  →  { data: ['booking', 'payments'] }
 */
class TenantAddonController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;

        $featureFlags = TenantAddon::query()
            ->forTenant($tenantId)
            ->active()
            ->with('addon:id,feature_flag')
            ->get()
            ->filter(fn (TenantAddon $row) => $row->addon !== null)
            ->map(fn (TenantAddon $row) => $row->addon->feature_flag)
            ->values()
            ->all();

        return response()->json(['data' => $featureFlags]);
    }
}
