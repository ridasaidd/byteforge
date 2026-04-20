<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\TenantActivity;
use App\Models\Theme;
use App\Notifications\TenantSupportAccessOwnerNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class CentralTenantOperationsTest extends TestCase
{
    private function central(): array
    {
        return ['HTTP_HOST' => 'localhost'];
    }

    #[Test]
    public function central_admin_can_view_tenant_inspection_summary(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $baselineTotalPages = Page::query()->where('tenant_id', $tenant->id)->count();
        $baselinePublishedPages = Page::query()->where('tenant_id', $tenant->id)->where('status', 'published')->count();

        $theme = Theme::factory()->create([
            'tenant_id' => $tenant->id,
            'is_active' => true,
            'is_system_theme' => false,
            'slug' => 'inspection-active-theme',
            'name' => 'Inspection Active Theme',
        ]);

        Page::factory()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Inspection Published Page',
            'status' => 'published',
        ]);

        Page::factory()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Inspection Draft Page',
            'status' => 'draft',
        ]);

        TenantActivity::query()->create([
            'tenant_id' => $tenant->id,
            'log_name' => 'tenant',
            'event' => 'updated',
            'description' => 'Inspection activity entry',
            'subject_type' => Page::class,
            'subject_id' => 1,
            'causer_type' => null,
            'causer_id' => null,
            'properties' => ['source' => 'test'],
        ]);

        $response = $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/summary");

        $response->assertOk()
            ->assertJsonPath('data.tenant.id', $tenant->id)
            ->assertJsonPath('data.stats.total_pages', $baselineTotalPages + 2)
            ->assertJsonPath('data.stats.published_pages', $baselinePublishedPages + 1)
            ->assertJsonPath('data.active_theme.id', $theme->id);
    }

    #[Test]
    public function central_admin_can_list_tenant_themes_pages_and_activity(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $otherTenant = TestUsers::tenant('tenant-two');

        Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'slug' => 'inspection-system-theme',
            'name' => 'Inspection System Theme',
        ]);

        Theme::factory()->create([
            'tenant_id' => $tenant->id,
            'is_system_theme' => false,
            'is_active' => true,
            'slug' => 'inspection-tenant-theme',
            'name' => 'Inspection Tenant Theme',
        ]);

        Theme::factory()->create([
            'tenant_id' => $otherTenant->id,
            'is_system_theme' => false,
            'slug' => 'inspection-other-tenant-theme',
            'name' => 'Inspection Other Tenant Theme',
        ]);

        $visiblePage = Page::factory()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Visible Tenant Page',
            'slug' => 'visible-tenant-page',
            'status' => 'published',
        ]);

        Page::factory()->create([
            'tenant_id' => $otherTenant->id,
            'title' => 'Other Tenant Page',
            'slug' => 'other-tenant-page',
            'status' => 'published',
        ]);

        TenantActivity::query()->create([
            'tenant_id' => $tenant->id,
            'log_name' => 'tenant',
            'event' => 'created',
            'description' => 'Tenant page created',
            'subject_type' => Page::class,
            'subject_id' => $visiblePage->id,
            'causer_type' => null,
            'causer_id' => null,
            'properties' => ['source' => 'test'],
        ]);

        TenantActivity::query()->create([
            'tenant_id' => $otherTenant->id,
            'log_name' => 'tenant',
            'event' => 'created',
            'description' => 'Other tenant activity',
            'subject_type' => Page::class,
            'subject_id' => 999,
            'causer_type' => null,
            'causer_id' => null,
            'properties' => ['source' => 'test'],
        ]);

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/themes")
            ->assertOk()
            ->assertJsonFragment(['slug' => 'inspection-tenant-theme'])
            ->assertJsonFragment(['slug' => 'inspection-system-theme'])
            ->assertJsonMissing(['slug' => 'inspection-other-tenant-theme']);

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/pages?search=visible-tenant-page")
            ->assertOk()
            ->assertJsonFragment(['slug' => 'visible-tenant-page'])
            ->assertJsonMissing(['slug' => 'other-tenant-page']);

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/activity-logs")
            ->assertOk()
            ->assertJsonFragment(['description' => 'Tenant page created'])
            ->assertJsonMissing(['description' => 'Other tenant activity']);
    }

    #[Test]
    public function support_and_viewer_cannot_access_central_tenant_operator_endpoints(): void
    {
        $tenant = TestUsers::tenant('tenant-one');

        $this->actingAsCentralSupport()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/summary")
            ->assertForbidden();

        $this->actingAsCentralViewer()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/pages")
            ->assertForbidden();
    }

    #[Test]
    public function central_admin_can_activate_a_tenant_theme_from_central(): void
    {
        $tenant = TestUsers::tenant('tenant-one');

        Theme::query()->where('tenant_id', $tenant->id)->update(['is_active' => false]);

        Theme::factory()->create([
            'tenant_id' => $tenant->id,
            'is_system_theme' => false,
            'is_active' => true,
            'slug' => 'tenant-current-theme',
            'name' => 'Tenant Current Theme',
        ]);

        Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'slug' => 'tenant-activation-system-theme',
            'name' => 'Tenant Activation System Theme',
        ]);

        $response = $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->postJson("/api/superadmin/tenants/{$tenant->id}/themes/activate", [
                'slug' => 'tenant-activation-system-theme',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.slug', 'tenant-activation-system-theme')
            ->assertJsonPath('data.tenant_id', $tenant->id)
            ->assertJsonPath('data.is_active', true);

        $this->assertSame(
            1,
            Theme::query()->where('tenant_id', $tenant->id)->where('slug', 'tenant-activation-system-theme')->where('is_active', true)->count(),
        );
    }

    #[Test]
    public function central_admin_can_grant_list_and_revoke_tenant_support_access(): void
    {
        Notification::fake();

        $tenant = TestUsers::tenant('tenant-one');
        $supportUser = TestUsers::centralSupport();
        $owner = TestUsers::tenantOwner('tenant-one');

        $create = $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->postJson("/api/superadmin/tenants/{$tenant->id}/support-access", [
                'support_user_id' => $supportUser->id,
                'reason' => 'Investigate booking issue',
                'duration_hours' => 24,
            ]);

        $create->assertCreated()
            ->assertJsonPath('data.support_user.email', $supportUser->email)
            ->assertJsonPath('data.status', 'active');

        Notification::assertSentTo(
            $owner,
            TenantSupportAccessOwnerNotification::class,
            fn (TenantSupportAccessOwnerNotification $notification) => $notification->event === TenantSupportAccessOwnerNotification::EVENT_GRANTED
                && $notification->grant->support_user_id === $supportUser->id
        );

        $grantId = (int) $create->json('data.id');

        $this->assertDatabaseHas('memberships', [
            'user_id' => $supportUser->id,
            'tenant_id' => $tenant->id,
            'role' => 'support_access',
            'status' => 'active',
            'source' => 'support_access',
        ]);

        $this->assertDatabaseHas('tenant_support_access_grants', [
            'id' => $grantId,
            'tenant_id' => $tenant->id,
            'support_user_id' => $supportUser->id,
            'status' => 'active',
        ]);

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/support-access")
            ->assertOk()
            ->assertJsonFragment(['email' => $supportUser->email])
            ->assertJsonPath('data.grants.0.other_active_grants_count', 0);

        $revoke = $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->postJson("/api/superadmin/tenants/{$tenant->id}/support-access/{$grantId}/revoke", [
                'reason' => 'Issue resolved',
            ]);

        $revoke->assertOk()
            ->assertJsonPath('data.status', 'revoked');

        Notification::assertSentTo(
            $owner,
            TenantSupportAccessOwnerNotification::class,
            fn (TenantSupportAccessOwnerNotification $notification) => $notification->event === TenantSupportAccessOwnerNotification::EVENT_REVOKED
                && $notification->grant->support_user_id === $supportUser->id
        );

        $this->assertDatabaseHas('memberships', [
            'user_id' => $supportUser->id,
            'tenant_id' => $tenant->id,
            'status' => 'revoked',
            'source' => 'support_access',
        ]);

        $this->assertDatabaseHas('tenant_support_access_grants', [
            'id' => $grantId,
            'status' => 'revoked',
        ]);

        $this->assertTrue(
            TenantActivity::query()
                ->where('tenant_id', $tenant->id)
                ->where('subject_type', \App\Models\User::class)
                ->where('subject_id', (string) $supportUser->id)
                ->whereIn('event', ['granted', 'revoked'])
                ->count() >= 2
        );
    }

    #[Test]
    public function central_admin_can_grant_same_support_user_to_multiple_tenants_concurrently(): void
    {
        $tenantOne = TestUsers::tenant('tenant-one');
        $tenantTwo = TestUsers::tenant('tenant-two');
        $supportUser = TestUsers::centralSupport();

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->postJson("/api/superadmin/tenants/{$tenantOne->id}/support-access", [
                'support_user_id' => $supportUser->id,
                'reason' => 'Investigate tenant one issue',
                'duration_hours' => 24,
            ])
            ->assertCreated();

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->postJson("/api/superadmin/tenants/{$tenantTwo->id}/support-access", [
                'support_user_id' => $supportUser->id,
                'reason' => 'Investigate tenant two issue',
                'duration_hours' => 24,
            ])
            ->assertCreated()
            ->assertJsonPath('data.support_user.email', $supportUser->email);

        $this->assertDatabaseHas('tenant_support_access_grants', [
            'tenant_id' => $tenantOne->id,
            'support_user_id' => $supportUser->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('tenant_support_access_grants', [
            'tenant_id' => $tenantTwo->id,
            'support_user_id' => $supportUser->id,
            'status' => 'active',
        ]);

        $this->actingAsCentralAdmin()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenantTwo->id}/support-access")
            ->assertOk()
            ->assertJsonPath('data.grants.0.other_active_grants_count', 1)
            ->assertJsonFragment(['tenant_slug' => 'tenant-one']);
    }

    #[Test]
    public function support_and_viewer_cannot_manage_tenant_support_access(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $supportUser = TestUsers::centralSupport();

        $this->actingAsCentralSupport()
            ->withServerVariables($this->central())
            ->getJson("/api/superadmin/tenants/{$tenant->id}/support-access")
            ->assertForbidden();

        $this->actingAsCentralViewer()
            ->withServerVariables($this->central())
            ->postJson("/api/superadmin/tenants/{$tenant->id}/support-access", [
                'support_user_id' => $supportUser->id,
                'reason' => 'Blocked',
                'duration_hours' => 4,
            ])
            ->assertForbidden();
    }
}
