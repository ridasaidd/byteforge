<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsQueryService;
use Illuminate\Support\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AnalyticsController
 *
 * Serves aggregated analytics scoped to the current tenant.
 * Only events belonging to the initialised tenant are included.
 *
 * Routes (tenant domain, /api/analytics/...):
 *   GET /api/analytics/overview  → overview()
 *
 * Required permission: view analytics
 */
class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsQueryService $queryService) {}

    /**
     * GET /api/analytics/overview
     *
     * Query parameters:
     *   from  (Y-m-d) — start of period, default 30 days ago
     *   to    (Y-m-d) — end of period,   default today
     */
    public function overview(Request $request): JsonResponse
    {
        /** @var string $tenantId */
        $tenantId = (string) tenant('id');

        $from = $request->has('from')
            ? Carbon::parse($request->input('from'))->startOfDay()
            : now()->subDays(30)->startOfDay();

        $to = $request->has('to')
            ? Carbon::parse($request->input('to'))->endOfDay()
            : now()->endOfDay();

        $data = $this->queryService->tenantSummary($tenantId, $from, $to);

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
