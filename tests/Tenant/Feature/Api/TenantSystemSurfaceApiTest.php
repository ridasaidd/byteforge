<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\SystemSurface;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantSystemSurfaceApiTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_owner_can_list_provisioned_system_surfaces(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/system-surfaces'));

        $response->assertOk();

        $this->assertCount(5, $response->json('data'));
        $this->assertSame(
            [
                SystemSurface::KEY_TENANT_LOGIN,
                SystemSurface::KEY_REGISTER,
                SystemSurface::KEY_FORGOT_PASSWORD,
                SystemSurface::KEY_RESET_PASSWORD,
                SystemSurface::KEY_GUEST_PORTAL,
            ],
            array_column($response->json('data'), 'surface_key'),
        );
    }

    #[Test]
    public function tenant_owner_can_update_and_reset_a_system_surface(): void
    {
        $update = $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->tenantUrl('/api/system-surfaces/guest_portal'), [
                'is_enabled' => false,
                'settings' => ['headline' => 'My portal'],
                'puck_data' => ['content' => [], 'root' => ['props' => ['heroTitle' => 'My portal']]],
            ]);

        $update->assertOk()
            ->assertJsonPath('data.surface_key', SystemSurface::KEY_GUEST_PORTAL)
            ->assertJsonPath('data.is_enabled', false)
            ->assertJsonPath('data.settings.headline', 'My portal');

        $reset = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/system-surfaces/guest_portal/reset'));

        $reset->assertOk()
            ->assertJsonPath('data.surface_key', SystemSurface::KEY_GUEST_PORTAL)
            ->assertJsonPath('data.is_enabled', true)
            ->assertJsonPath('data.route_path', '/guest-portal')
            ->assertJsonPath('data.settings', []);

        $surface = SystemSurface::query()
            ->where('tenant_id', (string) TestUsers::tenant('tenant-one')->id)
            ->where('surface_key', SystemSurface::KEY_GUEST_PORTAL)
            ->firstOrFail();

        $this->assertNull($surface->puck_data);
    }

    #[Test]
    public function tenant_viewer_can_list_but_cannot_edit_system_surfaces(): void
    {
        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->tenantUrl('/api/system-surfaces'))
            ->assertOk();

        $this->actingAsTenantViewer('tenant-one')
            ->putJson($this->tenantUrl('/api/system-surfaces/tenant_login'), [
                'is_enabled' => false,
            ])
            ->assertForbidden();
    }

    #[Test]
    public function public_runtime_endpoint_returns_enabled_surface_without_authentication(): void
    {
        $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->tenantUrl('/api/system-surfaces/tenant_login'), [
                'puck_data' => [
                    'content' => [],
                    'root' => [
                        'props' => [
                            'title' => 'Custom tenant login',
                        ],
                    ],
                ],
            ])
            ->assertOk();

        $this->getJson($this->tenantUrl('/api/system-surfaces/public/tenant_login'))
            ->assertOk()
            ->assertJsonPath('data.surface_key', SystemSurface::KEY_TENANT_LOGIN)
            ->assertJsonPath('data.puck_data.root.props.title', 'Custom tenant login');
    }
}
