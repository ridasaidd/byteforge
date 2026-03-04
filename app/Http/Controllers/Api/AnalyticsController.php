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
 *   GET /api/analytics/overview   → overview()
 *   GET /api/analytics/pages      → pages()
 *   GET /api/analytics/bookings   → bookings()  (Phase 11 — returns empty until then)
 *   GET /api/analytics/revenue    → revenue()   (Phase 10 — returns empty until then)
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

    /**
     * GET /api/analytics/pages
     *
     * Page-level analytics (page.viewed events aggregated by page).
     * Populated once page.viewed is wired in Sub-phase 9.3.
     */
    public function pages(Request $request): JsonResponse
    {
        return response()->json([
            'data'         => [],
            'period'       => $this->resolvePeriod($request),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * GET /api/analytics/bookings
     *
     * Booking analytics — returns empty until Phase 11.
     */
    public function bookings(Request $request): JsonResponse
    {
        return response()->json([
            'data'         => [],
            'period'       => $this->resolvePeriod($request),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * GET /api/analytics/revenue
     *
     * Revenue analytics — returns empty until Phase 10.
     */
    public function revenue(Request $request): JsonResponse
    {
        return response()->json([
            'data'         => [],
            'period'       => $this->resolvePeriod($request),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    // ------------------------------------------------------------------ //

    private function resolvePeriod(Request $request): array
    {
        $from = $request->has('from')
            ? Carbon::parse($request->input('from'))->startOfDay()
            : now()->subDays(30)->startOfDay();

        $to = $request->has('to')
            ? Carbon::parse($request->input('to'))->endOfDay()
            : now()->endOfDay();

        return [
            'from' => $from->format('Y-m-d'),
            'to'   => $to->format('Y-m-d'),
        ];
    }
}
