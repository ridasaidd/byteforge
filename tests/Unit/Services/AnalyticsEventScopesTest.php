<?php

namespace Tests\Unit\Services;

use App\Models\AnalyticsEvent;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AnalyticsEventScopesTest extends TestCase
{
    use DatabaseTransactions;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function makeEvent(array $overrides = []): AnalyticsEvent
    {
        return AnalyticsEvent::create(array_merge([
            'tenant_id'   => null,
            'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
            'properties'  => [],
            'occurred_at' => now(),
        ], $overrides));
    }

    // -------------------------------------------------------------------------
    // scopeForTenant
    // -------------------------------------------------------------------------

    #[Test]
    public function for_tenant_scope_returns_only_that_tenants_events(): void
    {
        $this->makeEvent(['tenant_id' => 'tenant-A', 'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->makeEvent(['tenant_id' => 'tenant-B', 'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->makeEvent(['tenant_id' => 'tenant-A', 'event_type' => AnalyticsEvent::TYPE_THEME_ACTIVATED]);

        $results = AnalyticsEvent::forTenant('tenant-A')->get();

        $this->assertCount(2, $results);
        $results->each(fn ($e) => $this->assertEquals('tenant-A', $e->tenant_id));
    }

    #[Test]
    public function for_tenant_scope_excludes_platform_events(): void
    {
        $this->makeEvent(['tenant_id' => null]);
        $this->makeEvent(['tenant_id' => 'tenant-A']);

        $results = AnalyticsEvent::forTenant('tenant-A')->get();

        $this->assertCount(1, $results);
        $this->assertEquals('tenant-A', $results->first()->tenant_id);
    }

    // -------------------------------------------------------------------------
    // scopePlatformLevel
    // -------------------------------------------------------------------------

    #[Test]
    public function platform_level_scope_returns_only_null_tenant_id_events(): void
    {
        $this->makeEvent(['tenant_id' => null,       'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED]);
        $this->makeEvent(['tenant_id' => null,       'event_type' => AnalyticsEvent::TYPE_PLATFORM_ERROR]);
        $this->makeEvent(['tenant_id' => 'tenant-X', 'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);

        $results = AnalyticsEvent::platformLevel()->get();

        $this->assertCount(2, $results);
        $results->each(fn ($e) => $this->assertNull($e->tenant_id));
    }

    #[Test]
    public function platform_level_scope_excludes_tenant_events(): void
    {
        $this->makeEvent(['tenant_id' => 'tenant-Y']);

        $results = AnalyticsEvent::platformLevel()->get();

        $this->assertCount(0, $results);
    }

    // -------------------------------------------------------------------------
    // scopeOfType
    // -------------------------------------------------------------------------

    #[Test]
    public function of_type_scope_filters_by_event_type(): void
    {
        $this->makeEvent(['event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->makeEvent(['event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->makeEvent(['event_type' => AnalyticsEvent::TYPE_THEME_ACTIVATED]);

        $results = AnalyticsEvent::ofType(AnalyticsEvent::TYPE_PAGE_VIEWED)->get();

        $this->assertCount(2, $results);
        $results->each(fn ($e) => $this->assertEquals(AnalyticsEvent::TYPE_PAGE_VIEWED, $e->event_type));
    }

    #[Test]
    public function of_type_scope_returns_empty_when_no_match(): void
    {
        $this->makeEvent(['event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);

        $results = AnalyticsEvent::ofType(AnalyticsEvent::TYPE_BOOKING_CREATED)->get();

        $this->assertCount(0, $results);
    }

    // -------------------------------------------------------------------------
    // scopeBetween
    // -------------------------------------------------------------------------

    #[Test]
    public function between_scope_returns_events_within_date_range(): void
    {
        $this->makeEvent(['occurred_at' => Carbon::parse('2026-01-10')]);
        $this->makeEvent(['occurred_at' => Carbon::parse('2026-01-20')]);
        $this->makeEvent(['occurred_at' => Carbon::parse('2026-02-05')]);

        $results = AnalyticsEvent::between(
            Carbon::parse('2026-01-01'),
            Carbon::parse('2026-01-31')
        )->get();

        $this->assertCount(2, $results);
    }

    #[Test]
    public function between_scope_is_inclusive_on_boundaries(): void
    {
        $from = Carbon::parse('2026-03-01 00:00:00');
        $to   = Carbon::parse('2026-03-31 23:59:59');

        $this->makeEvent(['occurred_at' => $from]);
        $this->makeEvent(['occurred_at' => $to]);
        $this->makeEvent(['occurred_at' => Carbon::parse('2026-04-01')]);

        $results = AnalyticsEvent::between($from, $to)->get();

        $this->assertCount(2, $results);
    }

    #[Test]
    public function between_scope_excludes_events_outside_range(): void
    {
        $this->makeEvent(['occurred_at' => Carbon::parse('2025-12-31')]);
        $this->makeEvent(['occurred_at' => Carbon::parse('2026-04-01')]);

        $results = AnalyticsEvent::between(
            Carbon::parse('2026-01-01'),
            Carbon::parse('2026-03-31')
        )->get();

        $this->assertCount(0, $results);
    }

    // -------------------------------------------------------------------------
    // Scope combinations (isolation parity with activity log)
    // -------------------------------------------------------------------------

    #[Test]
    public function tenant_A_cannot_see_tenant_B_events_via_scopes(): void
    {
        $this->makeEvent(['tenant_id' => 'tenant-A', 'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->makeEvent(['tenant_id' => 'tenant-B', 'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->makeEvent(['tenant_id' => null,        'event_type' => AnalyticsEvent::TYPE_PLATFORM_ERROR]);

        $tenantAEvents = AnalyticsEvent::forTenant('tenant-A')->get();

        $this->assertCount(1, $tenantAEvents);
        $this->assertNotContains('tenant-B', $tenantAEvents->pluck('tenant_id')->all());
        $this->assertNotContains(null, $tenantAEvents->pluck('tenant_id')->all());
    }

    #[Test]
    public function central_scope_cannot_see_tenant_events(): void
    {
        $this->makeEvent(['tenant_id' => null,        'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED]);
        $this->makeEvent(['tenant_id' => 'tenant-C', 'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED]);

        $centralEvents = AnalyticsEvent::platformLevel()->get();

        $this->assertCount(1, $centralEvents);
        $this->assertNull($centralEvents->first()->tenant_id);
    }
}
