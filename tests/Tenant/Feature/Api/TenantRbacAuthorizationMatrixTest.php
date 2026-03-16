<?php

namespace Tests\Tenant\Feature\Api;

use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantRbacAuthorizationMatrixTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function admin_can_list_tenant_users(): void
    {
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/users', 'tenant-one'))
            ->assertOk();
    }

    #[Test]
    public function support_cannot_list_tenant_users(): void
    {
        $this->actingAsTenantEditor()
            ->getJson($this->tenantUrl('/api/users', 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function viewer_cannot_list_tenant_users(): void
    {
        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/users', 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function support_can_create_pages_but_viewer_cannot(): void
    {
        $payload = [
            'title' => 'RBAC Matrix Page',
            'slug' => 'rbac-matrix-page',
            'page_type' => 'general',
            'status' => 'draft',
            'puck_data' => [],
        ];

        $this->actingAsTenantEditor()
            ->postJson($this->tenantUrl('/api/pages', 'tenant-one'), $payload)
            ->assertStatus(201);

        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->tenantUrl('/api/pages', 'tenant-one'), [
                ...$payload,
                'slug' => 'rbac-matrix-page-viewer',
            ])
            ->assertForbidden();
    }

    #[Test]
    public function only_admin_can_access_settings_endpoints(): void
    {
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/settings', 'tenant-one'))
            ->assertOk();

        $this->actingAsTenantEditor()
            ->getJson($this->tenantUrl('/api/settings', 'tenant-one'))
            ->assertForbidden();

        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/settings', 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function analytics_are_available_to_admin_and_support_but_not_viewer(): void
    {
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-one'))
            ->assertOk();

        $this->actingAsTenantEditor()
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-one'))
            ->assertOk();

        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/analytics/overview', 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function support_cannot_access_payment_provider_endpoints(): void
    {
        $this->actingAsTenantEditor('tenant-one')
            ->getJson($this->tenantUrl('/api/payment-providers', 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function viewer_can_list_media_folders(): void
    {
        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/media-folders', 'tenant-one'))
            ->assertOk();
    }
}
