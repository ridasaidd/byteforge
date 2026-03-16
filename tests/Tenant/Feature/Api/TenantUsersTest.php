<?php

namespace Tests\Tenant\Feature\Api;

use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantUsersTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_owner_is_exposed_as_admin_in_users_list(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/users', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('data.0.email', 'editor@tenant-one.byteforge.se');

        $ownerRow = collect($response->json('data'))->firstWhere('email', 'owner@tenant-one.byteforge.se');

        $this->assertNotNull($ownerRow);
        $this->assertSame('admin', $ownerRow['roles'][0]['name'] ?? null);
    }

    #[Test]
    public function tenant_owner_cannot_change_own_role(): void
    {
        $owner = TestUsers::tenantOwner('tenant-one');

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl("/api/users/{$owner->id}/roles", 'tenant-one'), [
                'role' => 'viewer',
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'You cannot change your own role.');
    }

    #[Test]
    public function tenant_editor_cannot_change_other_users_roles(): void
    {
        $viewer = TestUsers::tenantViewer('tenant-one');

        $response = $this->actingAsTenantEditor()
            ->postJson($this->tenantUrl("/api/users/{$viewer->id}/roles", 'tenant-one'), [
                'role' => 'support',
            ]);

        $response->assertForbidden();
    }

    #[Test]
    public function tenant_owner_can_change_another_users_role(): void
    {
        $editor = TestUsers::tenantEditor('tenant-one');

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl("/api/users/{$editor->id}/roles", 'tenant-one'), [
                'role' => 'viewer',
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.email', $editor->email);
        $response->assertJsonPath('data.roles.0.name', 'viewer');
    }
}
