<?php

namespace Tests\Feature\Api;

use App\Models\AnalyticsEvent;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Central Analytics API tests.
 *
 * Covers: GET /api/superadmin/analytics/overview
 *   - Authentication + permission enforcement
 *   - Correct response envelope shape
 *   - Only platform-level (tenant_id = null) events are served
 *   - Date range filtering via ?from= and ?to=
 */
class CentralAnalyticsApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $endpoint = '/api/superadmin/analytics/overview';

    // =========================================================================
    // Authentication & Authorisation
    // =========================================================================

    #[Test]
    public function unauthenticated_request_returns_401(): void
    {
        // Central-domain requests work correctly without a logged-in user
        // because FilesystemTenancyBootstrapper does NOT run on the central domain.
        $response = $this->getJson($this->endpoint);

        $response->assertUnauthorized();
    }

    #[Test]
    public function central_viewer_without_platform_analytics_permission_returns_403(): void
    {
        // The 'viewer' role has 'view analytics' but NOT 'view platform analytics'
        $response = $this->actingAsCentralViewer()->getJson($this->endpoint);

        $response->assertForbidden();
    }

    #[Test]
    public function superadmin_can_access_platform_analytics(): void
    {
        $response = $this->actingAsSuperadmin()->getJson($this->endpoint);

        $response->assertOk();
    }

    #[Test]
    public function central_admin_can_access_platform_analytics(): void
    {
        $response = $this->actingAsCentralAdmin()->getJson($this->endpoint);

        $response->assertOk();
    }

    // =========================================================================
    // Response Envelope Shape
    // =========================================================================

    #[Test]
    public function response_has_correct_envelope_structure(): void
    {
        $response = $this->actingAsSuperadmin()->getJson($this->endpoint);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'total_events',
                    'by_type',
                ],
                'period' => ['from', 'to'],
                'generated_at',
            ]);
    }

    #[Test]
    public function response_period_reflects_query_parameters(): void
    {
        $response = $this->actingAsSuperadmin()
            ->getJson($this->endpoint . '?from=2025-01-01&to=2025-01-31');

        $response->assertOk()
            ->assertJsonPath('period.from', '2025-01-01')
            ->assertJsonPath('period.to', '2025-01-31');
    }

    // =========================================================================
    // Data Filtering — platform-level events only
    // =========================================================================

    #[Test]
    public function platform_events_are_included_in_response(): void
    {
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);

        $response = $this->actingAsSuperadmin()->getJson($this->endpoint);

        $response->assertOk()
            ->assertJsonPath('data.total_events', 1);
    }

    #[Test]
    public function tenant_scoped_events_are_excluded_from_central_analytics(): void
    {
        // This is the security-critical isolation check.
        // Platform analytics must NEVER leak tenant business data.
        AnalyticsEvent::create([
            'tenant_id'  => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);

        $response = $this->actingAsSuperadmin()->getJson($this->endpoint);

        $response->assertOk()
            ->assertJsonPath('data.total_events', 0);
    }

    #[Test]
    public function events_outside_date_range_are_excluded(): void
    {
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => now()->subMonths(3),
        ]);

        $from = now()->subDays(7)->format('Y-m-d');
        $to   = now()->format('Y-m-d');

        $response = $this->actingAsSuperadmin()
            ->getJson("{$this->endpoint}?from={$from}&to={$to}");

        $response->assertOk()
            ->assertJsonPath('data.total_events', 0);
    }

    #[Test]
    public function events_inside_date_range_are_included(): void
    {
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => now()->subDays(3),
        ]);

        $from = now()->subDays(7)->format('Y-m-d');
        $to   = now()->format('Y-m-d');

        $response = $this->actingAsSuperadmin()
            ->getJson("{$this->endpoint}?from={$from}&to={$to}");

        $response->assertOk()
            ->assertJsonPath('data.total_events', 1);
    }

    #[Test]
    public function by_type_breakdown_is_correctly_aggregated(): void
    {
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_USER_REGISTERED,
            'properties' => [],
            'occurred_at' => now(),
        ]);
        AnalyticsEvent::create([
            'tenant_id'  => null,
            'event_type' => AnalyticsEvent::TYPE_PLATFORM_USER_REGISTERED,
            'properties' => [],
            'occurred_at' => now(),
        ]);

        $response = $this->actingAsSuperadmin()->getJson($this->endpoint);

        // assertJsonPath uses dot-notation for nesting, but event type keys contain
        // literal dots (e.g. 'tenant.created'). Use assertJson() instead.
        $response->assertOk()
            ->assertJsonPath('data.total_events', 3)
            ->assertJson([
                'data' => [
                    'by_type' => [
                        AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED  => 1,
                        AnalyticsEvent::TYPE_PLATFORM_USER_REGISTERED => 2,
                    ],
                ],
            ]);
    }
}
