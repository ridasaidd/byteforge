<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Single fire point for writing analytics events.
 *
 * Write side only (CQRS separation):
 *   - AnalyticsService  → record() / writes
 *   - AnalyticsQueryService → reads / aggregations (Phase 9.2)
 *
 * Usage:
 *   app(AnalyticsService::class)->record(
 *       AnalyticsEvent::TYPE_PAGE_VIEWED,
 *       ['page_id' => $page->id, 'slug' => $page->slug],
 *       tenantId: $page->tenant_id
 *   );
 */
class AnalyticsService
{
    /**
     * Record an analytics event.
     *
     * @param  string       $eventType   One of the AnalyticsEvent::TYPE_* constants.
     * @param  array        $properties  Arbitrary payload documented per event type.
     * @param  string|null  $tenantId    Explicit tenant ID. When null, resolved from
     *                                   ambient tenancy context (or null = platform event).
     * @param  Model|null   $subject     Model the event is about (e.g. Page, Theme).
     * @param  Model|null   $actor       Model that triggered the event (e.g. User).
     * @param  Carbon|null  $occurredAt  When the event happened. Defaults to now().
     */
    public function record(
        string  $eventType,
        array   $properties = [],
        ?string $tenantId   = null,
        ?Model  $subject    = null,
        ?Model  $actor      = null,
        ?Carbon $occurredAt = null
    ): AnalyticsEvent {
        return AnalyticsEvent::create([
            'tenant_id'    => $tenantId ?? $this->resolveTenantId(),
            'event_type'   => $eventType,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id'   => $subject ? (string) $subject->getKey() : null,
            'actor_type'   => $actor ? get_class($actor) : null,
            'actor_id'     => $actor ? (string) $actor->getKey() : null,
            'properties'   => $properties,
            'occurred_at'  => $occurredAt ?? now(),
            'created_at'   => now(),
        ]);
    }

    /**
     * Resolve tenant ID from the ambient tenancy context.
     * Returns null when executing outside a tenant context (platform/central).
     */
    private function resolveTenantId(): ?string
    {
        return tenancy()->initialized ? (string) tenant('id') : null;
    }
}
