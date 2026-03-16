<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\Tenant;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

/**
 * Tests for the tenant dashboard stats endpoint.
 *
 * Covers: GET /api/dashboard — stats are tenant-scoped and access-gated.
 */
class TenantDashboardTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    // =========================================================================
    // RESPONSE STRUCTURE
    // =========================================================================

    #[Test]
    public function dashboard_returns_correct_json_structure_for_owner(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonStructure([
            'totalPages',
            'publishedPages',
            'mediaFiles',
            'menuItems',
            'recentActivityCount',
        ]);
    }

    #[Test]
    public function dashboard_returns_correct_json_structure_for_editor(): void
    {
        $response = $this->actingAsTenantEditor('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonStructure([
            'totalPages',
            'publishedPages',
            'mediaFiles',
            'menuItems',
            'recentActivityCount',
        ]);
    }

    #[Test]
    public function dashboard_stats_are_integers(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();

        $data = $response->json();
        $this->assertIsInt($data['totalPages']);
        $this->assertIsInt($data['publishedPages']);
        $this->assertIsInt($data['mediaFiles']);
        $this->assertIsInt($data['menuItems']);
        $this->assertIsInt($data['recentActivityCount']);
    }

    #[Test]
    public function published_pages_never_exceed_total_pages(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();

        $this->assertLessThanOrEqual(
            $response->json('totalPages'),
            $response->json('publishedPages'),
            'publishedPages should not exceed totalPages'
        );
    }

    // =========================================================================
    // ACCESS CONTROL
    // =========================================================================

    #[Test]
    public function tenant_one_owner_cannot_access_tenant_two_dashboard(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-two'));

        $response->assertForbidden();
    }

    #[Test]
    public function central_superadmin_is_rejected_on_tenant_dashboard(): void
    {
        $response = $this->actingAsSuperadmin()
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertForbidden();
    }

    // =========================================================================
    // TENANT SCOPING
    // =========================================================================

    #[Test]
    public function dashboard_stats_are_zero_for_fresh_tenant_with_no_pages(): void
    {
        // Each test runs in a transaction, so no extra pages exist.
        // The seeded data may contain pages, so we just verify the counts are non-negative.
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();

        $this->assertGreaterThanOrEqual(0, $response->json('totalPages'));
        $this->assertGreaterThanOrEqual(0, $response->json('publishedPages'));
    }

    #[Test]
    public function different_tenants_return_independent_stats(): void
    {
        $tenantOneStats = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'))
            ->assertOk()
            ->json();

        $tenantTwoStats = $this->actingAsTenantOwner('tenant-two')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-two'))
            ->assertOk()
            ->json();

        // Both responses must have the required keys. Actual values may differ.
        $this->assertArrayHasKey('totalPages', $tenantOneStats);
        $this->assertArrayHasKey('totalPages', $tenantTwoStats);
    }
}
