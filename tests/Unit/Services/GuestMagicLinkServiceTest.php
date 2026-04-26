<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\GuestMagicLinkToken;
use App\Notifications\Guest\GuestMagicLinkNotification;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class GuestMagicLinkServiceTest extends TestCase
{
    private GuestMagicLinkService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(GuestMagicLinkService::class);
    }

    #[Test]
    public function it_issues_magic_link_tokens_and_notifies_guest(): void
    {
        Notification::fake();

        $tenant = TestUsers::tenant('tenant-one');

        $result = $this->service->issue(
            'guest.one@example.com',
            (string) $tenant->id,
            'http://tenant-one.byteforge.se/guest/magic',
        );

        $this->assertDatabaseHas('guest_users', [
            'email' => 'guest.one@example.com',
        ]);

        $this->assertDatabaseHas('guest_magic_link_tokens', [
            'id' => $result['token']->id,
            'guest_user_id' => $result['guestUser']->id,
            'tenant_id' => (string) $tenant->id,
            'used_at' => null,
        ]);

        Notification::assertSentTo(
            $result['guestUser'],
            GuestMagicLinkNotification::class,
            fn (GuestMagicLinkNotification $notification) => str_contains($notification->magicLink, $result['plainToken'])
                && $notification->tenant->is($tenant)
        );
    }

    #[Test]
    public function it_marks_tokens_used_and_verifies_guest_email_on_successful_verification(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $result = $this->service->issue(
            'guest.two@example.com',
            (string) $tenant->id,
            'http://tenant-one.byteforge.se/guest/magic',
        );

        $guestUser = $this->service->verify($result['plainToken'], (string) $tenant->id);

        $this->assertSame('guest.two@example.com', $guestUser->email);
        $this->assertNotNull($guestUser->email_verified_at);
        $this->assertNotNull($result['token']->fresh()?->used_at);
    }

    #[Test]
    public function it_rejects_reused_magic_link_tokens(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $result = $this->service->issue(
            'guest.three@example.com',
            (string) $tenant->id,
            'http://tenant-one.byteforge.se/guest/magic',
        );

        $this->service->verify($result['plainToken'], (string) $tenant->id);

        $this->expectException(ValidationException::class);

        $this->service->verify($result['plainToken'], (string) $tenant->id);
    }
}
