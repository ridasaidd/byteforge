<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use Carbon\Carbon;

/**
 * AnalyticsQueryService — read side of the analytics CQRS split.
 *
 * Provides aggregation methods over the append-only analytics_events table.
 * All methods return plain arrays suitable for JSON serialisation.
 *
 * Write side: @see AnalyticsService
 */
class AnalyticsQueryService
{
    /**
     * Summarise analytics events for a single tenant within a date range.
     *
     * Only events scoped to $tenantId are considered; platform-level events
     * (tenant_id = null) are always excluded.
     *
     * @return array{total_events: int, by_type: array<string, int>}
     */
    public function tenantSummary(string $tenantId, Carbon $from, Carbon $to): array
    {
        $rows = AnalyticsEvent::forTenant($tenantId)
            ->between($from, $to)
            ->selectRaw('event_type, COUNT(*) as cnt')
            ->groupBy('event_type')
            ->get();

        return $this->buildSummary($rows);
    }

    /**
     * Summarise platform-level analytics events within a date range.
     *
     * Only events with tenant_id = null are included; tenant-scoped events
     * are always excluded.
     *
     * @return array{total_events: int, by_type: array<string, int>}
     */
    public function platformSummary(Carbon $from, Carbon $to): array
    {
        $rows = AnalyticsEvent::platformLevel()
            ->between($from, $to)
            ->selectRaw('event_type, COUNT(*) as cnt')
            ->groupBy('event_type')
            ->get();

        return $this->buildSummary($rows);
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build the standard summary array from a grouped result set.
     *
     * @param \Illuminate\Support\Collection $rows  Rows with event_type + cnt
     * @return array{total_events: int, by_type: array<string, int>}
     */
    private function buildSummary(\Illuminate\Support\Collection $rows): array
    {
        $byType = [];
        $total  = 0;

        foreach ($rows as $row) {
            $byType[$row->event_type] = (int) $row->cnt;
            $total += (int) $row->cnt;
        }

        return [
            'total_events' => $total,
            'by_type'      => $byType,
        ];
    }
}
