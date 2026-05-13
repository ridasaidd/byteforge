<?php

namespace Tests\Feature\Api;

use App\Models\Membership;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Models\Theme;
use App\Models\User;
use App\Models\WebRefreshSession;
use App\Notifications\TenantUserManagementOwnerNotification;
use Illuminate\Support\Facades\Notification;
use Stancl\Tenancy\Database\Models\Domain;
use Tests\TestCase;

class TenantManagementTest extends TestCase
{

    public function test_can_list_tenants(): void
    {

        // Create some tenants
        $tenant1 = Tenant::create(['id' => '1', 'name' => 'Tenant 1', 'slug' => 'tenant-1']);
        Domain::create(['domain' => 'tenant1.test', 'tenant_id' => $tenant1->id]);

        $tenant2 = Tenant::create(['id' => '2', 'name' => 'Tenant 2', 'slug' => 'tenant-2']);
        Domain::create(['domain' => 'tenant2.test', 'tenant_id' => $tenant2->id]);

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/tenants');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_can_create_tenant(): void
    {

        $data = [
            'name' => 'New Test Tenant',
            'domain' => 'newtest.example.com',
        ];

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', $data);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at'],
            ])
            ->assertJson([
                'data' => [
                    'name' => 'New Test Tenant',
                    'domain' => 'newtest.example.com',
                ],
            ]);

        $this->assertDatabaseHas('tenants', ['name' => 'New Test Tenant']);
        $this->assertDatabaseHas('domains', ['domain' => 'newtest.example.com']);
    }

    public function test_newly_created_tenant_gets_a_default_active_theme_when_system_themes_exist(): void
    {
        Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'slug' => 'tenant-create-default-theme',
            'name' => 'Tenant Create Default Theme',
        ]);

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'name' => 'Provisioned Tenant',
            'domain' => 'provisioned.example.com',
        ]);

        $response->assertStatus(201);

        $tenantId = $response->json('data.id');

        $this->assertNotNull($tenantId);
        $this->assertSame(
            1,
            Theme::query()->where('tenant_id', $tenantId)->where('is_active', true)->count(),
            'Newly created tenants should have exactly one active tenant-scoped theme.',
        );

        $this->assertDatabaseHas('themes', [
            'tenant_id' => $tenantId,
            'is_active' => true,
            'is_system_theme' => false,
        ]);
    }

    public function test_cannot_create_tenant_without_name(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'domain' => 'test.example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_create_tenant_without_domain(): void
    {

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'name' => 'Test Tenant',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }

    public function test_cannot_create_tenant_with_duplicate_domain(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'Existing Tenant', 'slug' => 'existing-tenant']);
        Domain::create(['domain' => 'existing.test', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/tenants', [
            'name' => 'New Tenant',
            'domain' => 'existing.test',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['domain']);
    }

    public function test_can_show_single_tenant(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'Test Tenant', 'slug' => 'tenant-show-case']);
        Domain::create(['domain' => 'tenant-show.example.com', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->getJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $tenant->id,
                    'name' => 'Test Tenant',
                    'domain' => 'tenant-show.example.com',
                ],
            ]);
    }

    public function test_can_update_tenant(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'Old Name', 'slug' => 'old-name']);
        Domain::create(['domain' => 'old.test', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->putJson("/api/superadmin/tenants/{$tenant->id}", [
            'name' => 'New Name',
            'domain' => 'new.test',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'New Name',
                    'domain' => 'new.test',
                ],
            ]);

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'name' => 'New Name']);
        $this->assertDatabaseHas('domains', ['tenant_id' => $tenant->id, 'domain' => 'new.test']);
    }

    public function test_can_delete_tenant(): void
    {

        $tenant = Tenant::create(['id' => '1', 'name' => 'To Delete', 'slug' => 'to-delete']);
        Domain::create(['domain' => 'delete.test', 'tenant_id' => $tenant->id]);

        $response = $this->actingAsSuperadmin()->deleteJson("/api/superadmin/tenants/{$tenant->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Tenant deleted successfully']);

        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
    }

    public function test_requires_authentication(): void
    {
        // No authentication - should get 401
        $response = $this->getJson('/api/superadmin/tenants');
        $response->assertStatus(401);
    }

    public function test_requires_manage_tenants_permission(): void
    {
        // User with no permissions should be rejected
        $user = \App\Models\User::factory()->create();
        $response = $this->actingAs($user, 'api')->postJson('/api/superadmin/tenants', [
            'name' => 'Test',
            'domain' => 'forbidden.test',
        ]);
        $response->assertStatus(403);
    }

    public function test_can_add_owner_user_to_tenant_from_superadmin(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant New', 'slug' => 'tenant-new']);
        Domain::create(['domain' => 'tenant-new.example.com', 'tenant_id' => $tenant->id]);

        $payload = [
            'name' => 'Tenant Owner',
            'email' => 'owner@tenant-new.example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'owner',
        ];

        $response = $this->actingAsSuperadmin()->postJson("/api/superadmin/tenants/{$tenant->id}/users", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.user.email', 'owner@tenant-new.example.com')
            ->assertJsonPath('data.membership.tenant_id', (string) $tenant->id)
            ->assertJsonPath('data.membership.role', 'owner')
            ->assertJsonPath('data.membership.status', 'active');

        $user = User::query()->where('email', 'owner@tenant-new.example.com')->first();

        $this->assertNotNull($user);

        $this->assertDatabaseHas('memberships', [
            'tenant_id' => (string) $tenant->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        $membership = Membership::query()
            ->where('tenant_id', (string) $tenant->id)
            ->where('user_id', $user->id)
            ->first();

        $this->assertNotNull($membership);
    }

    public function test_adding_tenant_user_notifies_existing_owner_and_logs_tenant_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::create(['name' => 'Tenant Notify', 'slug' => 'tenant-notify']);
        Domain::create(['domain' => 'tenant-notify.example.com', 'tenant_id' => $tenant->id]);

        $owner = User::factory()->create(['email' => 'owner@tenant-notify.example.com']);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        $response = $this->actingAsSuperadmin()->postJson("/api/superadmin/tenants/{$tenant->id}/users", [
            'name' => 'Tenant Viewer',
            'email' => 'viewer@tenant-notify.example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'viewer',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.membership.role', 'viewer');

        $userId = (int) $response->json('data.user.id');

        Notification::assertSentTo(
            $owner,
            TenantUserManagementOwnerNotification::class,
            fn (TenantUserManagementOwnerNotification $notification) => $notification->event === TenantUserManagementOwnerNotification::EVENT_ASSIGNED
                && $notification->managedUser->id === $userId
                && $notification->currentRole === 'viewer'
        );

        $this->assertTrue(
            TenantActivity::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('subject_type', User::class)
                ->where('subject_id', (string) $userId)
                ->where('event', 'assigned')
                ->exists()
        );
    }

    public function test_can_list_tenant_users_from_superadmin(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant Team', 'slug' => 'tenant-team']);
        Domain::create(['domain' => 'tenant-team.example.com', 'tenant_id' => $tenant->id]);

        $owner = User::factory()->create(['email' => 'owner@tenant-team.example.com']);
        $viewer = User::factory()->create(['email' => 'viewer@tenant-team.example.com']);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
            'status' => 'active',
        ]);

        $response = $this->actingAsSuperadmin()->getJson("/api/superadmin/tenants/{$tenant->id}/users");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.email', 'owner@tenant-team.example.com')
            ->assertJsonPath('data.0.role', 'owner')
            ->assertJsonPath('data.1.email', 'viewer@tenant-team.example.com')
            ->assertJsonPath('data.1.role', 'viewer');
    }

    public function test_can_update_tenant_user_role_from_superadmin(): void
    {
        Notification::fake();

        $tenant = Tenant::create(['name' => 'Tenant Edit', 'slug' => 'tenant-edit']);
        Domain::create(['domain' => 'tenant-edit.example.com', 'tenant_id' => $tenant->id]);

        $owner = User::factory()->create(['email' => 'owner@tenant-edit.example.com']);
        $user = User::factory()->create(['email' => 'member@tenant-edit.example.com']);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $user->id,
            'role' => 'viewer',
            'status' => 'active',
        ]);

        $response = $this->actingAsSuperadmin()->patchJson("/api/superadmin/tenants/{$tenant->id}/users/{$user->id}", [
            'role' => 'editor',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.membership.role', 'editor')
            ->assertJsonPath('data.membership.tenant_id', (string) $tenant->id);

        $this->assertDatabaseHas('memberships', [
            'tenant_id' => (string) $tenant->id,
            'user_id' => $user->id,
            'role' => 'editor',
            'status' => 'active',
        ]);

        Notification::assertSentTo(
            $owner,
            TenantUserManagementOwnerNotification::class,
            fn (TenantUserManagementOwnerNotification $notification) => $notification->event === TenantUserManagementOwnerNotification::EVENT_UPDATED
                && $notification->managedUser->id === $user->id
                && $notification->previousRole === 'viewer'
                && $notification->currentRole === 'editor'
        );

        $this->assertTrue(
            TenantActivity::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('subject_type', User::class)
                ->where('subject_id', (string) $user->id)
                ->where('event', 'updated')
                ->exists()
        );
    }

    public function test_cannot_remove_last_owner_from_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant Owners', 'slug' => 'tenant-owners']);
        Domain::create(['domain' => 'tenant-owners.example.com', 'tenant_id' => $tenant->id]);

        $owner = User::factory()->create(['email' => 'owner@tenant-owners.example.com']);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        $response = $this->actingAsSuperadmin()->deleteJson("/api/superadmin/tenants/{$tenant->id}/users/{$owner->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Tenant must have at least one active owner.');

        $this->assertDatabaseHas('memberships', [
            'tenant_id' => (string) $tenant->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
        ]);
    }

    public function test_removing_tenant_user_revokes_tenant_refresh_sessions(): void
    {
        Notification::fake();

        $tenant = Tenant::create(['name' => 'Tenant Sessions', 'slug' => 'tenant-sessions']);
        Domain::create(['domain' => 'tenant-sessions.example.com', 'tenant_id' => $tenant->id]);

        $owner = User::factory()->create(['email' => 'owner@tenant-sessions.example.com']);
        $viewer = User::factory()->create(['email' => 'viewer@tenant-sessions.example.com']);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        Membership::query()->create([
            'tenant_id' => (string) $tenant->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
            'status' => 'active',
        ]);

        $session = WebRefreshSession::query()->create([
            'user_id' => $viewer->id,
            'tenant_id' => (string) $tenant->id,
            'host' => 'tenant-sessions.example.com',
            'token_hash' => hash('sha256', 'tenant-sessions-refresh-token'),
            'user_agent' => 'PHPUnit',
            'ip_address' => '127.0.0.1',
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->actingAsSuperadmin()->deleteJson("/api/superadmin/tenants/{$tenant->id}/users/{$viewer->id}");

        $response->assertOk()
            ->assertJsonPath('message', 'User removed from tenant successfully.');

        $this->assertNotNull($session->fresh()?->revoked_at);
        $this->assertDatabaseHas('memberships', [
            'tenant_id' => (string) $tenant->id,
            'user_id' => $viewer->id,
            'status' => 'inactive',
        ]);

        Notification::assertSentTo(
            $owner,
            TenantUserManagementOwnerNotification::class,
            fn (TenantUserManagementOwnerNotification $notification) => $notification->event === TenantUserManagementOwnerNotification::EVENT_REMOVED
                && $notification->managedUser->id === $viewer->id
                && $notification->previousRole === 'viewer'
        );

        $this->assertTrue(
            TenantActivity::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('subject_type', User::class)
                ->where('subject_id', (string) $viewer->id)
                ->where('event', 'removed')
                ->exists()
        );
    }
}
