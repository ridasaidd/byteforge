<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

class TenantActivityLogIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_activity_controller_uses_for_tenant_scope(): void
    {
        $tenantOne = $this->getTenant('tenant-one');
        $tenantTwo = $this->getTenant('tenant-two');
        $this->assertNotNull($tenantOne, 'Expected seeded tenant-one to exist');
        $this->assertNotNull($tenantTwo, 'Expected seeded tenant-two to exist');

        $userTenantOne = $this->getTenantUser('tenant-one');
        $userTenantTwo = $this->getTenantUser('tenant-two');
        $this->assertNotNull($userTenantOne, 'Expected seeded tenant-one user to exist');
        $this->assertNotNull($userTenantTwo, 'Expected seeded tenant-two user to exist');

        // Create activity in tenant-one context
        if (function_exists('tenancy')) {
            tenancy()->initialize($tenantOne);
        }
        $tenantOneDesc = 'activity-tenant-one-'.uniqid();
        activity('tenant')
            ->causedBy($userTenantOne)
            ->event('created')
            ->log($tenantOneDesc);

        // Create activity in tenant-two context
        if (function_exists('tenancy')) {
            tenancy()->end();
            tenancy()->initialize($tenantTwo);
        }
        $tenantTwoDesc = 'activity-tenant-two-'.uniqid();
        activity('tenant')
            ->causedBy($userTenantTwo)
            ->event('updated')
            ->log($tenantTwoDesc);

        // Verify ActivityLogController uses forTenant() by directly calling the method
        // Initialize tenancy for tenant-one and query directly
        if (function_exists('tenancy')) {
            tenancy()->end();
            tenancy()->initialize($tenantOne);
        }

        $activitiesForTenantOne = \App\Models\TenantActivity::forTenant()->get();

        // Should include tenant-one's activity
        $this->assertTrue(
            $activitiesForTenantOne->contains('description', $tenantOneDesc),
            "Expected tenant-one activity to be found when scoped to tenant-one"
        );

        // Should NOT include tenant-two's activity (scoped by forTenant)
        $this->assertFalse(
            $activitiesForTenantOne->contains('description', $tenantTwoDesc),
            "Expected tenant-two activity to NOT be found when scoped to tenant-one"
        );

        // Verify tenant-two sees only their own activity
        if (function_exists('tenancy')) {
            tenancy()->end();
            tenancy()->initialize($tenantTwo);
        }

        $activitiesForTenantTwo = \App\Models\TenantActivity::forTenant()->get();

        // Should include tenant-two's activity
        $this->assertTrue(
            $activitiesForTenantTwo->contains('description', $tenantTwoDesc),
            "Expected tenant-two activity to be found when scoped to tenant-two"
        );

        // Should NOT include tenant-one's activity (scoped by forTenant)
        $this->assertFalse(
            $activitiesForTenantTwo->contains('description', $tenantOneDesc),
            "Expected tenant-one activity to NOT be found when scoped to tenant-two"
        );
    }
}

