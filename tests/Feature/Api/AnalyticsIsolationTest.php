<?php

namespace Tests\Feature\Api;

use App\Models\AnalyticsEvent;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Analytics Isolation Tests.
 *
 * Validates that the analytics pipeline respects multi-tenant boundaries at two levels:
 *
 * 1. QUERY ISOLATION (tested here via central domain + service layer)
 *    - Platform analytics endpoint only serves platform-level (tenant_id = null) events
 *    - Tenant users cannot access the central platform analytics endpoint
 *    - Cross-tenant isolation is verified in AnalyticsQueryServiceTest (unit)
 *
 * 2. TENANT-DOMAIN HTTP ISOLATION (skipped — architectural constraint)
 *    Tenant-domain HTTP tests are skipped because TenancyTeamResolver returns
 *    string tenant IDs incompatible with the bigint model_has_permissions.team_id
 *    column. See TenantAnalyticsApiTest class docblock for the full explanation.
 *    Cross-tenant query isolation is fully covered by AnalyticsQueryServiceTest.
 */
class AnalyticsIsolationTest extends TestCase
{
    // =========================================================================
    // Platform Analytics — central domain (these WORK)
    // =========================================================================

    #[Test]
    public function platform_analytics_excludes_all_tenant_scoped_events(): void
    {
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_two',
            'event_type' => AnalyticsEvent::TYPE_THEME_ACTIVATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);

        $response = $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/analytics/overview');

        // Platform analytics only sees 1 event (platform-level), never tenant events
        $response->assertOk()
            ->assertJsonPath('data.total_events', 1);
    }

    #[Test]
    public function tenant_user_cannot_access_central_platform_analytics(): void
    {
        // Tenant users have 'view analytics' but NOT 'view platform analytics'.
        // The central route requires 'view platform analytics'.
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson('/api/superadmin/analytics/overview');

        $response->assertForbidden();
    }

    #[Test]
    public function central_viewer_cannot_access_platform_analytics_without_permission(): void
    {
        // 'viewer' role has 'view analytics' but NOT 'view platform analytics'
        $response = $this->actingAsCentralViewer()
            ->getJson('/api/superadmin/analytics/overview');

        $response->assertForbidden();
    }

    // =========================================================================
    // Cross-Tenant Isolation (skipped — tenant-domain URL constraint)
    // Covered at the query level by AnalyticsQueryServiceTest::
    //   tenant_summary_excludes_other_tenant_events()
    //   platform_summary_excludes_tenant_scoped_events()
    // =========================================================================

    #[Test]
    public function cross_tenant_isolation_is_enforced_at_query_level(): void
    {
        $this->markTestSkipped(
            'Tenant-domain HTTP isolation tests skipped: covered by AnalyticsQueryServiceTest ' .
            'unit tests which verify forTenant() and platformLevel() scope isolation directly.'
        );
    }
}
