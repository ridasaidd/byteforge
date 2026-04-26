<?php

declare(strict_types=1);

namespace Tests\Central\Feature\Api;

use App\Notifications\Guest\GuestMagicLinkNotification;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class GuestIdentityApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.internal.service_token', 'test-central-service-token');
    }

    private function centralHost(): string
    {
        return (string) (config('tenancy.central_domains')[0] ?? 'byteforge.se');
    }

    private function centralUrl(string $path): string
    {
        return 'http://'.$this->centralHost().$path;
    }

    #[Test]
    public function issue_magic_link_requires_service_token(): void
    {
        $tenant = TestUsers::tenant('tenant-one');

        $this->postJson($this->centralUrl('/api/guest/issue-magic-link'), [
            'email' => 'guest.api@example.com',
            'tenant_id' => (string) $tenant->id,
            'redirect_url' => 'http://tenant-one.byteforge.se/guest/magic',
        ])->assertUnauthorized();
    }

    #[Test]
    public function issue_magic_link_creates_guest_identity_and_sends_notification(): void
    {
        Notification::fake();

        $tenant = TestUsers::tenant('tenant-one');

        $response = $this->withHeader('X-Service-Token', 'test-central-service-token')
            ->postJson($this->centralUrl('/api/guest/issue-magic-link'), [
                'email' => "  guest.api@example.com\t ",
                'tenant_id' => (string) $tenant->id,
                'redirect_url' => 'http://tenant-one.byteforge.se/guest/magic',
            ]);

        $response->assertOk()
            ->assertJsonPath('sent', true)
            ->assertJsonPath('data.email', 'guest.api@example.com');

        $this->assertDatabaseHas('guest_users', [
            'email' => 'guest.api@example.com',
        ]);

        Notification::assertSentTo(
            \App\Models\GuestUser::query()->where('email', 'guest.api@example.com')->firstOrFail(),
            GuestMagicLinkNotification::class,
        );
    }

    #[Test]
    public function verify_magic_token_returns_guest_identity_for_valid_token(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $result = app(GuestMagicLinkService::class)->issue(
            'guest.verify@example.com',
            (string) $tenant->id,
            'http://tenant-one.byteforge.se/guest/magic',
        );

        $response = $this->withHeader('X-Service-Token', 'test-central-service-token')
            ->postJson($this->centralUrl('/api/guest/verify-magic-token'), [
                'token' => $result['plainToken'],
                'tenant_id' => (string) $tenant->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.guest_user_id', $result['guestUser']->id)
            ->assertJsonPath('data.email', 'guest.verify@example.com');
    }

    #[Test]
    public function verify_magic_token_rejects_invalid_or_wrong_tenant_tokens(): void
    {
        $tenantOne = TestUsers::tenant('tenant-one');
        $tenantTwo = TestUsers::tenant('tenant-two');

        $result = app(GuestMagicLinkService::class)->issue(
            'guest.invalid@example.com',
            (string) $tenantOne->id,
            'http://tenant-one.byteforge.se/guest/magic',
        );

        $this->withHeader('X-Service-Token', 'test-central-service-token')
            ->postJson($this->centralUrl('/api/guest/verify-magic-token'), [
                'token' => $result['plainToken'],
                'tenant_id' => (string) $tenantTwo->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['token']);
    }
}
