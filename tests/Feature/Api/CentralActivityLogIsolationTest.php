<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

class CentralActivityLogIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_activity_endpoint_excludes_tenant_logs(): void
    {
        $superadmin = $this->getCentralUser('superadmin');
        $this->assertNotNull($superadmin, 'Expected seeded superadmin user to exist');

        // Authenticate as superadmin (has 'view activity logs' permission)
        Passport::actingAs($superadmin);

        // Ensure tenancy is not initialized for central events
        if (function_exists('tenancy') && tenancy()->initialized) {
            tenancy()->end();
        }

        $centralDesc = 'test-central-activity-'.uniqid();
        activity('central')
            ->causedBy($superadmin)
            ->event('created')
            ->log($centralDesc);

        // Create a tenant-scoped activity
        $tenant = $this->getTenant('tenant-one');
        $this->assertNotNull($tenant, 'Expected seeded tenant-one to exist');

        if (function_exists('tenancy')) {
            tenancy()->initialize($tenant);
        }

        $tenantUser = $this->getTenantUser('tenant-one');
        $this->assertNotNull($tenantUser, 'Expected seeded tenant user for tenant-one to exist');

        $tenantDesc = 'test-tenant-activity-'.uniqid();
        activity('tenant')
            ->causedBy($tenantUser)
            ->event('updated')
            ->log($tenantDesc);

        // End tenancy before calling central endpoint
        if (function_exists('tenancy') && tenancy()->initialized) {
            tenancy()->end();
        }

        // Call central activity endpoint
        $response = $this->getJson('/api/superadmin/activity-logs?per_page=50');

        $response->assertStatus(200);

        // Should include the central activity description
        $response->assertJsonFragment(['description' => $centralDesc]);

        // Should not include the tenant activity description
        $response->assertJsonMissing(['description' => $tenantDesc]);

        // Additionally, every returned item must have log_name = 'central'
        $data = $response->json('data') ?? [];
        foreach ($data as $item) {
            $this->assertEquals('central', $item['log_name'] ?? null);
        }
    }
}
