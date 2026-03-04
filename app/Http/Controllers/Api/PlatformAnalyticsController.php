<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsQueryService;
use Illuminate\Support\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PlatformAnalyticsController
 *
 * Serves aggregated analytics for the platform as a whole.
 * Only platform-level events (tenant_id = null) are included.
 *
 * Routes (central domain, /api/superadmin/analytics/...):
 *   GET /api/superadmin/analytics/overview  → overview()
 *
 * Required permission: view platform analytics
 */
class PlatformAnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsQueryService $queryService) {}

    /**
     * GET /api/superadmin/analytics/overview
     *
     * Query parameters:
     *   from  (Y-m-d) — start of period, default 30 days ago
     *   to    (Y-m-d) — end of period,   default today
     */
    public function overview(Request $request): JsonResponse
    {
        $from = $request->has('from')
            ? Carbon::parse($request->input('from'))->startOfDay()
            : now()->subDays(30)->startOfDay();

        $to = $request->has('to')
            ? Carbon::parse($request->input('to'))->endOfDay()
            : now()->endOfDay();

        $data = $this->queryService->platformSummary($from, $to);

        return response()->json([
            'data'         => $data,
            'period'       => [
                'from' => $from->format('Y-m-d'),
                'to'   => $to->format('Y-m-d'),
            ],
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
