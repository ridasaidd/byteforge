<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * API Routes & RBAC Pilot Test
 *
 * Demonstrates the seeded-data approach:
 *   - No users are created here — all users come from TestFixturesSeeder.
 *   - DatabaseTransactions (from TestCase) rolls back any writes after each test.
 *   - actingAs*() helpers authenticate as the right seeded user.
 *
 * Central users (roles → permissions):
 *   superadmin → all permissions
 *   admin      → manage users, manage tenants, view/manage everything
 *   support    → view users, view tenants, view analytics (no manage)
 *   viewer     → view users, view tenants, view dashboard stats (no manage)
 *
 * Tenant users (direct permissions, no central access):
 *   owner  → full tenant CRUD (pages, nav, themes, media, layouts)
 *   editor → create/edit pages, nav, manage media (no delete, no themes.manage)
 *   viewer → read-only on all tenant resources
 */
class ApiRoutesTest extends TestCase
{
    // DatabaseTransactions is inherited from TestCase — no need to re-declare it.

    // Shorthand server variables for central and tenant domains.
    private function central(): array
    {
        return ['HTTP_HOST' => 'localhost'];
    }

    private function tenant(string $slug = 'tenant-one'): array
    {
        return ['HTTP_HOST' => "{$slug}.byteforge.se"];
    }

    /**
     * Build a full URL for a tenant domain request.
     * Using a full URL ensures $request->getHost() is correctly resolved
     * by InitializeTenancyByDomain middleware in the test client.
     */
    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    // =========================================================================
    // Authentication
    // =========================================================================

    #[Test]
    public function login_with_seeded_credentials_returns_token(): void
    {
        $this->withServerVariables($this->central())
            ->postJson('/api/auth/login', [
                'email'    => 'superadmin@byteforge.se',
                'password' => 'password',
            ])
            ->assertOk()
            ->assertJsonStructure(['user', 'token']);
    }

    #[Test]
    public function login_with_wrong_password_returns_422(): void
    {
        $this->withServerVariables($this->central())
            ->postJson('/api/auth/login', [
                'email'    => 'superadmin@byteforge.se',
                'password' => 'wrong-password',
            ])
            ->assertUnprocessable();
    }

    #[Test]
    public function registration_is_disabled_on_central(): void
    {
        $this->withServerVariables($this->central())
            ->postJson('/api/auth/register', [
                'name'                  => 'New User',
                'email'                 => 'new@example.com',
                'password'              => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertNotFound();
    }

    #[Test]
    public function unauthenticated_request_is_rejected(): void
    {
        $this->withServerVariables($this->central())
            ->getJson('/api/superadmin/users')
            ->assertUnauthorized();
    }

    // =========================================================================
    // Central RBAC — superadmin
    // =========================================================================

    #[Test]
    public function superadmin_can_list_users(): void
    {
        $this->actingAsSuperadmin()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/users')
            ->assertOk();
    }

    #[Test]
    public function superadmin_can_list_tenants(): void
    {
        $this->actingAsSuperadmin()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/tenants')
            ->assertOk();
    }

    #[Test]
    public function superadmin_can_view_dashboard_stats(): void
    {
        $this->actingAsSuperadmin()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/dashboard/stats')
            ->assertOk();
    }

    // =========================================================================
    // Central RBAC — admin
    // =========================================================================

    #[Test]
    public function admin_can_list_users(): void
    {
        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/users')
            ->assertOk();
    }

    #[Test]
    public function admin_can_list_tenants(): void
    {
        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/tenants')
            ->assertOk();
    }

    // =========================================================================
    // Central RBAC — support (view only)
    // =========================================================================

    #[Test]
    public function support_can_view_users(): void
    {
        // support has 'view users' permission
        $this->actingAsCentralSupport()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/users')
            ->assertOk();
    }

    #[Test]
    public function support_cannot_delete_users(): void
    {
        // support does NOT have 'manage users'
        $this->actingAsCentralSupport()
            ->withServerVariables($this->central())
            ->deleteJson('/api/superadmin/users/1')
            ->assertForbidden();
    }

    #[Test]
    public function support_cannot_create_tenants(): void
    {
        // support does NOT have 'manage tenants'
        $this->actingAsCentralSupport()
            ->withServerVariables($this->central())
            ->postJson('/api/superadmin/tenants', [
                'name' => 'Unauthorized Tenant',
                'slug' => 'unauthorized',
            ])
            ->assertForbidden();
    }

    // =========================================================================
    // Central RBAC — viewer (most restricted)
    // =========================================================================

    #[Test]
    public function viewer_can_view_dashboard_stats(): void
    {
        // viewer has 'view dashboard stats'
        $this->actingAsCentralViewer()
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/dashboard/stats')
            ->assertOk();
    }

    #[Test]
    public function viewer_cannot_delete_tenants(): void
    {
        // viewer does NOT have 'manage tenants'
        $this->actingAsCentralViewer()
            ->withServerVariables($this->central())
            ->deleteJson('/api/superadmin/tenants/tenant_one')
            ->assertForbidden();
    }

    #[Test]
    public function viewer_cannot_manage_roles(): void
    {
        // viewer does NOT have 'manage roles'
        $this->actingAsCentralViewer()
            ->withServerVariables($this->central())
            ->postJson('/api/superadmin/roles', ['name' => 'new-role'])
            ->assertForbidden();
    }

    // =========================================================================
    // Tenant RBAC — owner (full access within tenant)
    // =========================================================================

    #[Test]
    public function tenant_owner_can_list_pages(): void
    {
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/pages', 'tenant-one'))
            ->assertOk();
    }

    #[Test]
    public function tenant_owner_can_create_a_page(): void
    {
        // This write is rolled back by DatabaseTransactions after the test.
        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/pages', 'tenant-one'), [
                'title'     => 'Test Page',
                'slug'      => 'test-page-' . uniqid(),
                'page_type' => 'general',
                'status'    => 'draft',
            ])
            ->assertCreated();
    }

    // =========================================================================
    // Tenant RBAC — viewer (read-only)
    // =========================================================================

    #[Test]
    public function tenant_viewer_can_list_pages(): void
    {
        // viewer has 'pages.view'
        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/pages', 'tenant-one'))
            ->assertOk();
    }

    #[Test]
    public function tenant_viewer_cannot_create_pages(): void
    {
        // viewer does NOT have 'pages.create'
        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->tenantUrl('/api/pages', 'tenant-one'), [
                'title'     => 'Unauthorized Page',
                'slug'      => 'unauthorized',
                'page_type' => 'general',
                'status'    => 'draft',
            ])
            ->assertForbidden();
    }

    #[Test]
    public function tenant_viewer_cannot_delete_pages(): void
    {
        // viewer does NOT have 'pages.delete'
        $this->actingAsTenantViewer('tenant-one')
            ->deleteJson($this->tenantUrl('/api/pages/1', 'tenant-one'))
            ->assertForbidden();
    }

    // =========================================================================
    // Tenant isolation — tenant users cannot access central superadmin routes
    // =========================================================================

    #[Test]
    public function tenant_owner_cannot_access_central_superadmin_routes(): void
    {
        // Tenant owner has no central permissions (view users, manage tenants, etc.)
        $this->actingAsTenantOwner('tenant-one')
            ->withServerVariables($this->central())
            ->getJson('/api/superadmin/users')
            ->assertForbidden();
    }


    #[Test]
    public function tenant_two_pages_are_isolated_from_tenant_one(): void
    {
        // Each tenant's page list is scoped — no page ID should appear in both lists.
        $idsOne = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/pages', 'tenant-one'))
            ->assertOk()
            ->json('data.*.id');

        $idsTwo = $this->actingAsTenantOwner('tenant-two')
            ->getJson($this->tenantUrl('/api/pages', 'tenant-two'))
            ->assertOk()
            ->json('data.*.id');

        $this->assertEmpty(
            array_intersect($idsOne ?? [], $idsTwo ?? []),
            'Tenant-one and tenant-two page lists must not overlap.'
        );
    }
}
