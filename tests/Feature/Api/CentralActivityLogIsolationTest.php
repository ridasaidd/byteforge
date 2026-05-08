<?php
namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Tenant;
use App\Models\TenantActivity;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class CentralActivityLogIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        TenantActivity::query()->delete();
    }

    private function centralHost(): string
    {
        return (string) (config('tenancy.central_domains')[0] ?? 'localhost');
    }

    private function logForTenant(string $tenantSlug, string $description): Tenant
    {
        $tenant = Tenant::query()->where('slug', $tenantSlug)->firstOrFail();
        $owner = TestUsers::tenantOwner($tenantSlug);
        $page = Page::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'title' => ucfirst($tenantSlug) . ' central audit page',
            'slug' => $tenantSlug . '-central-audit-page',
            'status' => 'draft',
        ]);

        tenancy()->initialize($tenant);
        activity('pages')
            ->causedBy($owner)
            ->performedOn($page)
            ->event('created')
            ->log($description);
        tenancy()->end();

        return $tenant;
    }

    #[Test]
    public function activity_log_isolation(): void
    {
        $tenantOne = $this->logForTenant('tenant-one', 'tenant one central activity');
        $tenantTwo = $this->logForTenant('tenant-two', 'tenant two central activity');

        $oneResponse = $this->actingAsCentralAdmin()
            ->withServerVariables(['HTTP_HOST' => $this->centralHost()])
            ->getJson('/api/superadmin/tenants/' . $tenantOne->id . '/activity-logs');

        $twoResponse = $this->actingAsCentralAdmin()
            ->withServerVariables(['HTTP_HOST' => $this->centralHost()])
            ->getJson('/api/superadmin/tenants/' . $tenantTwo->id . '/activity-logs');

        $oneResponse->assertOk();
        $twoResponse->assertOk();

        $this->assertSame(1, (int) $oneResponse->json('meta.total'));
        $this->assertSame(1, (int) $twoResponse->json('meta.total'));
        $this->assertStringContainsString('tenant one', (string) $oneResponse->json('data.0.description'));
        $this->assertStringContainsString('tenant two', (string) $twoResponse->json('data.0.description'));
    }
}
