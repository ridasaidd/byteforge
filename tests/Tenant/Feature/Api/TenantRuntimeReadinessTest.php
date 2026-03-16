<?php

namespace Tests\Tenant\Feature\Api;

use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantRuntimeReadinessTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_login_route_serves_tenant_shell_view(): void
    {
        $response = $this->get($this->tenantUrl('/login', 'tenant-one'));

        $response->assertOk();
        $response->assertSee('id="tenant-app"', false);
        $response->assertSee('resources/js/tenant.tsx', false);
    }

    #[Test]
    public function tenant_cms_route_serves_tenant_shell_view(): void
    {
        $response = $this->get($this->tenantUrl('/cms/pages', 'tenant-one'));

        $response->assertOk();
        $response->assertSee('id="tenant-app"', false);
        $response->assertSee('resources/js/tenant.tsx', false);
    }

    #[Test]
    public function tenant_owner_can_access_dashboard_stats_on_own_tenant_domain(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonStructure([
            'totalPages',
            'publishedPages',
            'mediaFiles',
            'menuItems',
            'recentActivityCount',
        ]);
    }

    #[Test]
    public function user_is_forbidden_on_other_tenant_domain_even_when_authenticated(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/dashboard', 'tenant-two'));

        $response->assertForbidden();
    }
}
