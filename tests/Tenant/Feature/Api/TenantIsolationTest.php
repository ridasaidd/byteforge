<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\Membership;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

/**
 * Tests for cross-tenant data isolation guarantees.
 *
 * Verifies that authenticated users can only access data on their own tenant
 * domain and that the EnsureTenantMembership middleware correctly enforces
 * strict active-membership checks.
 */
class TenantIsolationTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    // =========================================================================
    // CROSS-TENANT ACCESS PREVENTION
    // =========================================================================

    #[Test]
    public function tenant_one_owner_is_rejected_on_tenant_two_domain(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-two'));

        $response->assertForbidden();
    }

    #[Test]
    public function tenant_two_owner_is_rejected_on_tenant_three_domain(): void
    {
        $response = $this->actingAsTenantOwner('tenant-two')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-three'));

        $response->assertForbidden();
    }

    #[Test]
    public function tenant_one_editor_is_rejected_on_tenant_two_domain(): void
    {
        $response = $this->actingAsTenantEditor('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-two'));

        $response->assertForbidden();
    }

    #[Test]
    public function tenant_one_viewer_is_rejected_on_tenant_two_domain(): void
    {
        $response = $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-two'));

        $response->assertForbidden();
    }

    // =========================================================================
    // CENTRAL USER ACCESS PREVENTION
    // =========================================================================

    #[Test]
    public function central_superadmin_is_rejected_on_any_tenant_domain(): void
    {
        foreach (['tenant-one', 'tenant-two', 'tenant-three'] as $slug) {
            $this->actingAsSuperadmin()
                ->getJson($this->tenantUrl('/api/dashboard', $slug))
                ->assertForbidden();
        }
    }

    #[Test]
    public function central_admin_is_rejected_on_tenant_domain(): void
    {
        $response = $this->actingAsCentralAdmin()
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertForbidden();
    }

    // =========================================================================
    // INACTIVE MEMBERSHIP ENFORCEMENT
    // =========================================================================

    #[Test]
    public function user_with_inactive_membership_is_rejected(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $user   = TestUsers::tenantOwner('tenant-one');

        // Temporarily mark the membership inactive for this test
        Membership::where('user_id', $user->id)
            ->where('tenant_id', $tenant->id)
            ->update(['status' => 'inactive']);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertForbidden();

        // The transaction rollback will restore the original status automatically
    }

    #[Test]
    public function user_with_active_membership_can_access_own_tenant(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();
    }

    // =========================================================================
    // MEMBERSHIP SCOPING INTEGRITY
    // =========================================================================

    #[Test]
    public function all_fixture_tenant_users_have_memberships(): void
    {
        $tenantSlugs = ['tenant-one', 'tenant-two', 'tenant-three'];
        $userTypes   = ['owner', 'editor', 'viewer'];

        foreach ($tenantSlugs as $slug) {
            $tenantId = str_replace('-', '_', $slug);

            foreach ($userTypes as $type) {
                $user = TestUsers::tenantByRole($slug, $type);

                $hasMembership = $user->memberships()
                    ->where('tenant_id', $tenantId)
                    ->where('status', 'active')
                    ->exists();

                $this->assertTrue(
                    $hasMembership,
                    "Expected {$type}@{$slug}.byteforge.se to have an active membership for {$tenantId}"
                );
            }
        }
    }
}
