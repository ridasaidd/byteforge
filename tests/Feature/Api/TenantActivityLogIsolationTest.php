<?php
namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Tenant;
use App\Models\TenantActivity;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantActivityLogIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        TenantActivity::query()->delete();
    }

    private function createTenantActivity(string $tenantSlug, string $description): void
    {
        $tenant = Tenant::query()->where('slug', $tenantSlug)->firstOrFail();
        $user = TestUsers::tenantOwner($tenantSlug);
        $page = Page::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'title' => ucfirst($tenantSlug) . ' page',
            'slug' => $tenantSlug . '-page',
            'status' => 'draft',
        ]);

        tenancy()->initialize($tenant);

        activity('pages')
            ->causedBy($user)
            ->performedOn($page)
            ->event('created')
            ->log($description);

        tenancy()->end();
    }

    #[Test]
    public function activity_log_isolation(): void
    {
        $this->createTenantActivity('tenant-one', 'tenant one event');
        $this->createTenantActivity('tenant-two', 'tenant two event');

        $tenantOne = TenantActivity::query()->forTenant('tenant_one')->first();
        $tenantTwo = TenantActivity::query()->forTenant('tenant_two')->first();

        $this->assertNotNull($tenantOne);
        $this->assertNotNull($tenantTwo);
        $this->assertStringContainsString('tenant one', (string) $tenantOne->description);
        $this->assertStringContainsString('tenant two', (string) $tenantTwo->description);
    }
}
