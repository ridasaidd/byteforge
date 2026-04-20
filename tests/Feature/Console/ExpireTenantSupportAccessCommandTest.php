<?php

namespace Tests\Feature\Console;

use App\Models\Membership;
use App\Models\TenantActivity;
use App\Models\TenantSupportAccessGrant;
use App\Models\WebRefreshSession;
use App\Notifications\TenantSupportAccessOwnerNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class ExpireTenantSupportAccessCommandTest extends TestCase
{
    #[Test]
    public function command_expires_elapsed_support_grants_and_notifies_owner(): void
    {
        Notification::fake();

        $tenant = TestUsers::tenant('tenant-one');
        $owner = TestUsers::tenantOwner('tenant-one');
        $supportUser = TestUsers::centralSupport();
        $grantedBy = TestUsers::centralAdmin();

        $membership = Membership::query()->create([
            'user_id' => $supportUser->id,
            'tenant_id' => (string) $tenant->id,
            'role' => 'support_access',
            'status' => 'active',
            'source' => 'support_access',
            'expires_at' => now()->subHour(),
        ]);

        $grant = TenantSupportAccessGrant::query()->create([
            'tenant_id' => (string) $tenant->id,
            'support_user_id' => $supportUser->id,
            'granted_by_user_id' => $grantedBy->id,
            'membership_id' => $membership->id,
            'reason' => 'Investigate expired support session',
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'expires_at' => now()->subHour(),
        ]);

        $session = WebRefreshSession::query()->create([
            'user_id' => $supportUser->id,
            'tenant_id' => (string) $tenant->id,
            'host' => 'tenant-one.byteforge.se',
            'token_hash' => hash('sha256', 'expired-support-session'),
            'user_agent' => 'PHPUnit',
            'ip_address' => '127.0.0.1',
            'last_used_at' => now()->subHour(),
            'expires_at' => now()->addDay(),
        ]);

        $this->artisan('support-access:expire')
            ->assertExitCode(0);

        $this->assertDatabaseHas('tenant_support_access_grants', [
            'id' => $grant->id,
            'status' => 'expired',
        ]);

        $this->assertDatabaseHas('memberships', [
            'id' => $membership->id,
            'status' => 'expired',
            'source' => 'support_access',
        ]);

        $this->assertNotNull($session->fresh()?->revoked_at);

        Notification::assertSentTo(
            $owner,
            TenantSupportAccessOwnerNotification::class,
            fn (TenantSupportAccessOwnerNotification $notification) => $notification->event === TenantSupportAccessOwnerNotification::EVENT_EXPIRED
                && $notification->grant->support_user_id === $supportUser->id
        );

        $this->assertTrue(
            TenantActivity::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('subject_type', \App\Models\User::class)
                ->where('subject_id', (string) $supportUser->id)
                ->where('event', 'expired')
                ->exists()
        );
    }
}
