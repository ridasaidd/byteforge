<?php

namespace Tests;

use Database\Seeders\TestFixturesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\PermissionRegistrar;
use Tests\Support\WithAuthentication;
use Tests\Support\WithTenancy;

/**
 * Base test case for ByteForge.
 *
 * Uses RefreshDatabase with $seed = true to automatically run TestFixturesSeeder
 * before each test. This ensures test users and tenants are always available.
 *
 * SEEDED TEST USERS (available in all tests):
 *
 * Central Users:
 *   - superadmin@byteforge.se (superadmin role) → $this->actingAsSuperadmin()
 *   - admin@byteforge.se (admin role) → $this->actingAsCentralAdmin()
 *   - support@byteforge.se (support role) → $this->actingAsCentralSupport()
 *   - viewer@byteforge.se (viewer role) → $this->actingAsCentralViewer()
 *
 * Tenant Users (per tenant: tenant-one, tenant-two, tenant-three):
 *   - owner@tenant-X.byteforge.se → $this->actingAsTenantOwner('tenant-one')
 *   - editor@tenant-X.byteforge.se → $this->actingAsTenantEditor('tenant-one')
 *   - viewer@tenant-X.byteforge.se → $this->actingAsTenantViewer('tenant-one')
 */
abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;
    use WithAuthentication;
    use WithTenancy;

    /**
     * Automatically seed the database before each test.
     */
    protected $seed = true;

    /**
     * Run this specific seeder before each test.
     */
    protected $seeder = TestFixturesSeeder::class;

    protected function setUp(): void
    {
        parent::setUp();

        // Disable activity logging to avoid UUID/bigint column mismatch
        // (tenant IDs are strings but activity_log.subject_id is bigint)
        \Spatie\Activitylog\Facades\Activity::disableLogging();

        // Clear permission cache to avoid stale data between tests
        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    protected function tearDown(): void
    {
        // Ensure tenant context is always cleaned up
        if (tenancy()->tenant) {
            tenancy()->end();
        }

        parent::tearDown();
    }

    // =========================================================================
    // LEGACY HELPERS (kept for backward compatibility)
    // Prefer using TestUsers:: or trait methods instead
    // =========================================================================

    /**
     * @deprecated Use TestUsers::centralByRole() or $this->actingAsCentralRole() instead
     */
    protected function getCentralUser(string $role): ?\App\Models\User
    {
        return \App\Models\User::whereHas('roles', function ($query) use ($role) {
            $query->where('name', $role)->where('guard_name', 'api');
        })->first();
    }

    /**
     * @deprecated Use TestUsers::tenantBySlug() or $this->actingAsTenantUser() instead
     */
    protected function getTenantUser(string $tenantSlug): ?\App\Models\User
    {
        return \App\Models\User::where('email', "user.{$tenantSlug}@byteforge.se")->first()
            ?? \App\Models\User::where('email', "owner.{$tenantSlug}@byteforge.se")->first();
    }

    /**
     * @deprecated Use TestUsers::tenant() or $this->getTenant() instead
     */
    protected function getSeededTenant(string $slug): ?\App\Models\Tenant
    {
        return \App\Models\Tenant::where('slug', $slug)->first();
    }
}


