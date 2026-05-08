<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Tenant;
use App\Models\TenantActivity;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        TenantActivity::query()->delete();
    }

    private function logPageEvent(string $tenantSlug, string $event, string $description): void
    {
        $tenant = Tenant::query()->where('slug', $tenantSlug)->firstOrFail();
        $user = TestUsers::tenantOwner($tenantSlug);
        $page = Page::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'title' => ucfirst($tenantSlug) . ' activity page',
            'slug' => $tenantSlug . '-' . $event . '-page',
            'status' => 'draft',
        ]);

        tenancy()->initialize($tenant);

        activity('pages')
            ->causedBy($user)
            ->performedOn($page)
            ->event($event)
            ->log($description);

        tenancy()->end();
    }

    #[Test]
    public function page_creation_is_logged(): void
    {
        $this->logPageEvent('tenant-one', 'created', 'Page created');

        $count = TenantActivity::query()->forTenant('tenant_one')->where('event', 'created')->count();

        $this->assertSame(1, $count);
    }

    #[Test]
    public function page_update_is_logged(): void
    {
        $this->logPageEvent('tenant-one', 'updated', 'Page updated');

        $count = TenantActivity::query()->forTenant('tenant_one')->where('event', 'updated')->count();

        $this->assertSame(1, $count);
    }

    #[Test]
    public function authenticated_user_activity_is_logged(): void
    {
        $owner = TestUsers::tenantOwner('tenant-one');
        $this->logPageEvent('tenant-one', 'created', 'Page created by owner');

        $activity = TenantActivity::query()->forTenant('tenant_one')->latest('id')->first();

        $this->assertNotNull($activity);
        $this->assertSame($owner->id, $activity->causer_id);
    }

    #[Test]
    public function activity_logs_are_scoped_to_tenant(): void
    {
        $this->logPageEvent('tenant-one', 'created', 'Tenant one page created');
        $this->logPageEvent('tenant-two', 'created', 'Tenant two page created');

        $tenantOneCount = TenantActivity::query()->forTenant('tenant_one')->count();
        $tenantTwoCount = TenantActivity::query()->forTenant('tenant_two')->count();

        $this->assertSame(1, $tenantOneCount);
        $this->assertSame(1, $tenantTwoCount);
    }
}
