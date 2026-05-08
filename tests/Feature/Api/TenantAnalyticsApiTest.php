<?php

namespace Tests\Feature\Api;

use App\Models\AnalyticsEvent;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TenantAnalyticsApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        AnalyticsEvent::query()->delete();
    }

    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        $template = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.dev.byteforge.se');
        $domain = str_replace(':tenant', $slug, $template);

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_owner_can_access_tenant_analytics(): void
    {
        AnalyticsEvent::create([
            'tenant_id' => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-one'));

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, (int) $response->json('data.total_events'));
    }

    #[Test]
    public function tenant_viewer_cannot_access_tenant_analytics(): void
    {
        $response = $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-one'));

        $response->assertForbidden();
    }

    #[Test]
    public function tenant_events_are_isolated_per_tenant(): void
    {
        AnalyticsEvent::create([
            'tenant_id' => 'tenant_one',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);
        AnalyticsEvent::create([
            'tenant_id' => 'tenant_two',
            'event_type' => AnalyticsEvent::TYPE_PAGE_CREATED,
            'properties' => [],
            'occurred_at' => now(),
        ]);

        $tenantOne = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-one'));

        $tenantTwo = $this->actingAsTenantOwner('tenant-two')
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-two'));

        $tenantOne->assertOk();
        $tenantTwo->assertOk();
        $this->assertSame(1, (int) $tenantOne->json('data.total_events'));
        $this->assertSame(1, (int) $tenantTwo->json('data.total_events'));
    }
}
