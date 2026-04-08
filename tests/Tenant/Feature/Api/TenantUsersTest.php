<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
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

    #[Test]
    public function tenant_owner_can_create_staff_user(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/users', 'tenant-one'), [
                'name' => 'Tenant Staff',
                'email' => 'staff-created@tenant-one.byteforge.se',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => 'support',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.email', 'staff-created@tenant-one.byteforge.se');
        $response->assertJsonPath('data.roles.0.name', 'support');

        $created = User::where('email', 'staff-created@tenant-one.byteforge.se')->first();
        $this->assertNotNull($created);
        $this->assertDatabaseHas('memberships', [
            'user_id' => $created->id,
            'tenant_id' => TestUsers::tenant('tenant-one')->id,
            'status' => 'active',
        ]);
    }

    #[Test]
    public function tenant_editor_cannot_create_staff_user(): void
    {
        $response = $this->actingAsTenantEditor('tenant-one')
            ->postJson($this->tenantUrl('/api/users', 'tenant-one'), [
                'name' => 'Blocked Staff',
                'email' => 'blocked-staff@tenant-one.byteforge.se',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => 'viewer',
            ]);

        $response->assertForbidden();
    }

    #[Test]
    public function tenant_owner_can_create_and_delete_unassigned_custom_role(): void
    {
        $create = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/roles', 'tenant-one'), [
                'name' => 'content_manager',
                'permissions' => ['pages.view', 'pages.edit'],
            ]);

        $create->assertCreated();
        $roleId = (int) $create->json('data.id');

        $delete = $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->tenantUrl("/api/roles/{$roleId}", 'tenant-one'));

        $delete->assertOk();

        $this->assertNull(Role::find($roleId));
    }

    #[Test]
    public function tenant_owner_cannot_delete_assigned_custom_role(): void
    {
        $viewer = TestUsers::tenantViewer('tenant-one');

        $create = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/roles', 'tenant-one'), [
                'name' => 'booking_assistant',
                'permissions' => ['bookings.view'],
            ]);

        $create->assertCreated();
        $roleId = (int) $create->json('data.id');

        $assign = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl("/api/users/{$viewer->id}/roles", 'tenant-one'), [
                'role' => 'booking_assistant',
            ]);

        $assign->assertOk();

        $delete = $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->tenantUrl("/api/roles/{$roleId}", 'tenant-one'));

        $delete->assertForbidden();
    }
}
