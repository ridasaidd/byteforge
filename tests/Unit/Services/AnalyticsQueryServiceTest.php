<?php

namespace Tests\Unit\Services;

use App\Models\AnalyticsEvent;
use App\Services\AnalyticsQueryService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Unit tests for AnalyticsQueryService (read/query side of CQRS).
 *
 * Tests aggregation over the analytics_events table with date range filtering.
 */
class AnalyticsQueryServiceTest extends TestCase
{
    use DatabaseTransactions;

    private AnalyticsQueryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AnalyticsQueryService();
    }

    // =========================================================================
    // tenantSummary()
    // =========================================================================

    #[Test]
    public function tenant_summary_returns_total_event_count(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-15'),
        ]);

        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_THEME_ACTIVATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-20'),
        ]);

        $result = $this->service->tenantSummary('tenant_one', $from, $to);

        $this->assertEquals(2, $result['total_events']);
    }

    #[Test]
    public function tenant_summary_groups_events_by_type(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-12'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_THEME_ACTIVATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-20'),
        ]);

        $result = $this->service->tenantSummary('tenant_one', $from, $to);

        $this->assertArrayHasKey('by_type', $result);
        $this->assertEquals(2, $result['by_type'][AnalyticsEvent::TYPE_PAGE_CREATED]);
        $this->assertEquals(1, $result['by_type'][AnalyticsEvent::TYPE_THEME_ACTIVATED]);
    }

    #[Test]
    public function tenant_summary_only_includes_events_in_date_range(): void
    {
        $from = Carbon::parse('2025-02-01');
        $to   = Carbon::parse('2025-02-28');

        // Inside range
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-02-15'),
        ]);
        // Outside range (before)
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-31'),
        ]);
        // Outside range (after)
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-03-01'),
        ]);

        $result = $this->service->tenantSummary('tenant_one', $from, $to);

        $this->assertEquals(1, $result['total_events']);
    }

    #[Test]
    public function tenant_summary_excludes_other_tenant_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_two',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);

        $result = $this->service->tenantSummary('tenant_one', $from, $to);

        $this->assertEquals(1, $result['total_events']);
    }

    #[Test]
    public function tenant_summary_excludes_platform_level_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null, // platform-level
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);

        $result = $this->service->tenantSummary('tenant_one', $from, $to);

        $this->assertEquals(1, $result['total_events']);
    }

    #[Test]
    public function tenant_summary_returns_zero_when_no_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        $result = $this->service->tenantSummary('tenant_one', $from, $to);

        $this->assertEquals(0, $result['total_events']);
        $this->assertEmpty($result['by_type']);
    }

    // =========================================================================
    // platformSummary()
    // =========================================================================

    #[Test]
    public function platform_summary_returns_total_event_count(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-05'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_USER_REGISTERED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);

        $result = $this->service->platformSummary($from, $to);

        $this->assertEquals(2, $result['total_events']);
    }

    #[Test]
    public function platform_summary_excludes_tenant_scoped_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        // Platform event
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-05'),
        ]);
        // Tenant event — must be excluded
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);

        $result = $this->service->platformSummary($from, $to);

        $this->assertEquals(1, $result['total_events']);
    }

    #[Test]
    public function platform_summary_only_includes_events_in_date_range(): void
    {
        $from = Carbon::parse('2025-03-01');
        $to   = Carbon::parse('2025-03-31');

        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-03-15'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-02-28'),
        ]);

        $result = $this->service->platformSummary($from, $to);

        $this->assertEquals(1, $result['total_events']);
    }

    #[Test]
    public function platform_summary_groups_events_by_type(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-05'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-08'),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_USER_REGISTERED,
            'properties' => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);

        $result = $this->service->platformSummary($from, $to);

        $this->assertArrayHasKey('by_type', $result);
        $this->assertEquals(2, $result['by_type'][AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED]);
        $this->assertEquals(1, $result['by_type'][AnalyticsEvent::TYPE_PLATFORM_USER_REGISTERED]);
    }

    #[Test]
    public function platform_summary_returns_zero_when_no_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        $result = $this->service->platformSummary($from, $to);

        $this->assertEquals(0, $result['total_events']);
        $this->assertEmpty($result['by_type']);
    }

    // =========================================================================
    // allTenantsSummary()
    // =========================================================================

    #[Test]
    public function all_tenants_summary_returns_total_event_count(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        foreach (['tenant_a', 'tenant_a', 'tenant_b'] as $tenantId) {
            AnalyticsEvent::create([
                'tenant_id'   => $tenantId,
                'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
                'properties'  => [],
                'occurred_at' => Carbon::parse('2025-01-15'),
            ]);
        }

        $result = $this->service->allTenantsSummary($from, $to);

        $this->assertEquals(3, $result['total_events']);
    }

    #[Test]
    public function all_tenants_summary_returns_distinct_tenant_count(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        // tenant_a fires 3 events, tenant_b fires 1 — distinct count must be 2
        foreach (['tenant_a', 'tenant_a', 'tenant_a', 'tenant_b'] as $tenantId) {
            AnalyticsEvent::create([
                'tenant_id'   => $tenantId,
                'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
                'properties'  => [],
                'occurred_at' => Carbon::parse('2025-01-10'),
            ]);
        }

        $result = $this->service->allTenantsSummary($from, $to);

        $this->assertEquals(2, $result['tenant_count']);
    }

    #[Test]
    public function all_tenants_summary_excludes_platform_level_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        // Platform event (null tenant_id) — must NOT be counted
        AnalyticsEvent::create([
            'tenant_id'   => null,
            'event_type'  => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties'  => [],
            'occurred_at' => Carbon::parse('2025-01-05'),
        ]);

        // Tenant event — must be counted
        AnalyticsEvent::create([
            'tenant_id'   => 'tenant_a',
            'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
            'properties'  => [],
            'occurred_at' => Carbon::parse('2025-01-10'),
        ]);

        $result = $this->service->allTenantsSummary($from, $to);

        $this->assertEquals(1, $result['total_events']);
        $this->assertEquals(1, $result['tenant_count']);
    }

    #[Test]
    public function all_tenants_summary_only_includes_events_in_date_range(): void
    {
        $from = Carbon::parse('2025-02-01');
        $to   = Carbon::parse('2025-02-28');

        // Outside range — must be excluded
        AnalyticsEvent::create([
            'tenant_id'   => 'tenant_a',
            'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
            'properties'  => [],
            'occurred_at' => Carbon::parse('2025-01-31'),
        ]);

        // Inside range — must be included
        AnalyticsEvent::create([
            'tenant_id'   => 'tenant_a',
            'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
            'properties'  => [],
            'occurred_at' => Carbon::parse('2025-02-15'),
        ]);

        $result = $this->service->allTenantsSummary($from, $to);

        $this->assertEquals(1, $result['total_events']);
    }

    #[Test]
    public function all_tenants_summary_groups_events_by_type(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        foreach (range(1, 3) as $_) {
            AnalyticsEvent::create([
                'tenant_id'   => 'tenant_a',
                'event_type'  => AnalyticsEvent::TYPE_PAGE_VIEWED,
                'properties'  => [],
                'occurred_at' => Carbon::parse('2025-01-10'),
            ]);
        }
        AnalyticsEvent::create([
            'tenant_id'   => 'tenant_b',
            'event_type'  => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties'  => [],
            'occurred_at' => Carbon::parse('2025-01-15'),
        ]);

        $result = $this->service->allTenantsSummary($from, $to);

        $this->assertEquals(3, $result['by_type'][AnalyticsEvent::TYPE_PAGE_VIEWED]);
        $this->assertEquals(1, $result['by_type'][AnalyticsEvent::TYPE_PAGE_CREATED]);
    }

    #[Test]
    public function all_tenants_summary_returns_zero_when_no_events(): void
    {
        $from = Carbon::parse('2025-01-01');
        $to   = Carbon::parse('2025-01-31');

        $result = $this->service->allTenantsSummary($from, $to);

        $this->assertEquals(0, $result['total_events']);
        $this->assertEquals(0, $result['tenant_count']);
        $this->assertEmpty($result['by_type']);
    }
}
