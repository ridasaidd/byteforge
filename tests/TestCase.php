<?php

namespace Tests;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\PermissionRegistrar;
use Tests\Support\WithAuthentication;
use Tests\Support\WithTenancy;

/**
 * Base test case for ByteForge.
 *
 * Uses DatabaseTransactions — each test runs inside a transaction that is
 * rolled back on tearDown. Seeded data (users, roles, tenants) persists.
 * Data created during a test disappears automatically. No migrate:fresh needed.
 *
 * To (re)set up the database: php artisan migrate:fresh --seed
 *
 * SEEDED TEST USERS (available in all tests):
 *
 * Central Users:
 *   - superadmin@byteforge.se (superadmin role) → $this->actingAsSuperadmin()
 *   - admin@byteforge.se      (admin role)       → $this->actingAsCentralAdmin()
 *   - support@byteforge.se    (support role)     → $this->actingAsCentralSupport()
 *   - viewer@byteforge.se     (viewer role)      → $this->actingAsCentralViewer()
 *
 * Tenant Users (per tenant: tenant-one, tenant-two, tenant-three):
 *   - owner@tenant-X.byteforge.se  → $this->actingAsTenantOwner('tenant-one')
 *   - editor@tenant-X.byteforge.se → $this->actingAsTenantEditor('tenant-one')
 *   - viewer@tenant-X.byteforge.se → $this->actingAsTenantViewer('tenant-one')
 */
abstract class TestCase extends BaseTestCase
{
    use DatabaseTransactions;
    use WithAuthentication;
    use WithTenancy;

    /** @var list<callable> Snapshot of error handlers taken in setUp, restored in tearDown to prevent PHPUnit "risky" flags */
    private array $errorHandlerSnapshot = [];

    /** @var list<callable> Snapshot of exception handlers */
    private array $exceptionHandlerSnapshot = [];

    protected function setUp(): void
    {
        // Snapshot handler stacks BEFORE Laravel boots (matches PHPUnit's snapshot).
        // Symfony ErrorHandler manipulates these during HTTP simulation,
        // so we restore them in tearDown before PHPUnit's check.
        $this->errorHandlerSnapshot = $this->captureErrorHandlers();
        $this->exceptionHandlerSnapshot = $this->captureExceptionHandlers();

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

        // Restore handler stacks AFTER parent tearDown (which may modify them),
        // but BEFORE PHPUnit's restoreGlobalErrorExceptionHandlers() check
        $this->restoreErrorHandlers();
        $this->restoreExceptionHandlers();
    }

    /** @return list<callable> */
    private function captureErrorHandlers(): array
    {
        $handlers = [];
        while (true) {
            $prev = set_error_handler(static fn () => false);
            restore_error_handler();
            if ($prev === null) {
                break;
            }
            $handlers[] = $prev;
            restore_error_handler();
        }
        // Re-push in order
        foreach ($handlers as $h) {
            set_error_handler($h);
        }
        return $handlers;
    }

    /** @return list<callable> */
    private function captureExceptionHandlers(): array
    {
        $handlers = [];
        while (true) {
            $prev = set_exception_handler(static fn () => null);
            restore_exception_handler();
            if ($prev === null) {
                break;
            }
            $handlers[] = $prev;
            restore_exception_handler();
        }
        foreach ($handlers as $h) {
            set_exception_handler($h);
        }
        return $handlers;
    }

    private function restoreErrorHandlers(): void
    {
        // Pop all current handlers
        while (true) {
            $prev = set_error_handler(static fn () => false);
            restore_error_handler();
            if ($prev === null) {
                break;
            }
            restore_error_handler();
        }
        // Re-push the snapshotted stack
        foreach ($this->errorHandlerSnapshot as $h) {
            set_error_handler($h);
        }
    }

    private function restoreExceptionHandlers(): void
    {
        while (true) {
            $prev = set_exception_handler(static fn () => null);
            restore_exception_handler();
            if ($prev === null) {
                break;
            }
            restore_exception_handler();
        }
        foreach ($this->exceptionHandlerSnapshot as $h) {
            set_exception_handler($h);
        }
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


