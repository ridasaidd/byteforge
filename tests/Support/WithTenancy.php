<?php

namespace Tests\Support;

use App\Models\Tenant;
use Closure;
use Tests\Support\TestUsers;

/**
 * Tenancy helper trait for multi-tenant tests.
 *
 * Provides methods for initializing and managing tenant context in tests.
 *
 * Usage:
 *   // Execute code within tenant context
 *   $this->withinTenant('tenant-one', function () {
 *       $this->actingAsTenantOwner('tenant-one')
 *           ->getJson('/api/pages')
 *           ->assertOk();
 *   });
 *
 *   // Manual tenant context management
 *   $this->initializeTenant('tenant-one');
 *   // ... test code ...
 *   $this->endTenant();
 *
 *   // Get tenant for assertions
 *   $tenant = $this->getTenant('tenant-one');
 *   $this->assertEquals('Tenant One', $tenant->name);
 */
trait WithTenancy
{
    /**
     * Currently active tenant (for reference in tests).
     */
    protected ?Tenant $currentTenant = null;

    // =========================================================================
    // TENANT CONTEXT MANAGEMENT
    // =========================================================================

    /**
     * Execute a callback within a tenant context.
     *
     * Automatically initializes tenancy before and ends it after.
     *
     * @param string $tenantSlug Tenant slug (tenant-one, tenant-two, tenant-three)
     * @param Closure $callback Code to execute within tenant context
     * @return mixed Result of the callback
     */
    protected function withinTenant(string $tenantSlug, Closure $callback): mixed
    {
        $tenant = $this->initializeTenant($tenantSlug);

        try {
            return $callback($tenant);
        } finally {
            $this->endTenant();
        }
    }

    /**
     * Initialize tenant context manually.
     *
     * Remember to call endTenant() when done!
     *
     * @param string $tenantSlug Tenant slug
     */
    protected function initializeTenant(string $tenantSlug): Tenant
    {
        $this->currentTenant = TestUsers::tenant($tenantSlug);
        tenancy()->initialize($this->currentTenant);
        return $this->currentTenant;
    }

    /**
     * End tenant context.
     */
    protected function endTenant(): void
    {
        tenancy()->end();
        $this->currentTenant = null;
    }

    /**
     * Get a tenant by slug without initializing context.
     */
    protected function getTenant(string $tenantSlug): Tenant
    {
        return TestUsers::tenant($tenantSlug);
    }

    /**
     * Get the currently active tenant.
     */
    protected function getCurrentTenant(): ?Tenant
    {
        return $this->currentTenant;
    }

    /**
     * Assert that we are in a specific tenant context.
     */
    protected function assertInTenantContext(string $tenantSlug): static
    {
        $currentTenantId = tenancy()->tenant?->id ?? null;
        $expectedTenant = TestUsers::tenant($tenantSlug);

        $this->assertEquals(
            $expectedTenant->id,
            $currentTenantId,
            "Expected to be in tenant context '{$tenantSlug}' but got: " . ($currentTenantId ?? 'no tenant')
        );

        return $this;
    }

    /**
     * Assert that we are NOT in any tenant context (central context).
     */
    protected function assertInCentralContext(): static
    {
        $currentTenantId = tenancy()->tenant?->id ?? null;

        $this->assertNull(
            $currentTenantId,
            "Expected to be in central context but got tenant: {$currentTenantId}"
        );

        return $this;
    }

    // =========================================================================
    // TENANT-SPECIFIC HTTP HELPERS
    // =========================================================================

    /**
     * Make a request with a specific tenant's domain.
     *
     * @param string $tenantSlug Tenant slug
     */
    protected function forTenant(string $tenantSlug): static
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return $this->withServerVariables(['HTTP_HOST' => $domain]);
    }

    /**
     * Make a request to central domain.
     */
    protected function forCentral(): static
    {
        return $this->withServerVariables(['HTTP_HOST' => 'localhost']);
    }
}
