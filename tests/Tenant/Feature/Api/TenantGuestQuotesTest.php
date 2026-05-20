<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\Addon;
use App\Models\GuestUser;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Services\Guest\GuestMagicLinkService;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantGuestQuotesTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = TestUsers::tenant('tenant-one');
    }

    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        $template = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.dev.byteforge.se');
        $domain = str_replace(':tenant', $slug, $template);

        return "http://{$domain}{$path}";
    }

    private function activateQuotesAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->where('feature_flag', 'estimates_quotes')->firstOrFail();

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null],
        );
    }

    /**
     * @return array{token: string, guest_id: int}
     */
    private function issueGuestSession(string $email, string $tenantSlug = 'tenant-one'): array
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $this->activateQuotesAddon($tenant);

        $result = app(GuestMagicLinkService::class)->issue(
            $email,
            (string) $tenant->id,
            $this->tenantUrl('/guest/magic', $tenantSlug),
        );

        $response = $this->postJson($this->tenantUrl('/api/guest-auth/verify', $tenantSlug), [
            'token' => $result['plainToken'],
        ]);

        $response->assertOk();

        return [
            'token' => (string) $response->json('token'),
            'guest_id' => (int) $response->json('guest.id'),
        ];
    }

    #[Test]
    public function guest_sign_in_links_existing_quote_requests_by_email_within_current_tenant(): void
    {
        $this->activateQuotesAddon($this->tenant);

        $tenantTwo = TestUsers::tenant('tenant-two');
        $this->activateQuotesAddon($tenantTwo);

        $linkedRequest = QuoteRequest::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Portal Guest',
            'guest_email' => 'portal.guest@example.com',
            'request_description' => 'Estimate needed.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $otherTenantRequest = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenantTwo->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Portal Guest',
            'guest_email' => 'portal.guest@example.com',
            'request_description' => 'Estimate needed.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $session = $this->issueGuestSession('portal.guest@example.com');

        $linkedRequest->refresh();
        $otherTenantRequest->refresh();

        $this->assertSame($session['guest_id'], $linkedRequest->guest_user_id);
        $this->assertNull($otherTenantRequest->guest_user_id);
    }

    #[Test]
    public function authenticated_guest_can_list_only_their_linked_quotes(): void
    {
        $this->activateQuotesAddon($this->tenant);

        $session = $this->issueGuestSession('list.quote@example.com');

        $ownedRequest = QuoteRequest::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'guest_user_id' => $session['guest_id'],
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Quote Guest',
            'guest_email' => 'list.quote@example.com',
            'subject_label' => 'Owned quote',
            'request_description' => 'Estimate needed.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $hiddenRequest = QuoteRequest::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Other Guest',
            'guest_email' => 'other.quote@example.com',
            'subject_label' => 'Hidden quote',
            'request_description' => 'Different guest.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        Quote::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'quote_request_id' => $ownedRequest->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 12000,
            'total_minor' => 12000,
            'customer_message' => 'Owned quote message',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        Quote::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'quote_request_id' => $hiddenRequest->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9900,
            'total_minor' => 9900,
            'customer_message' => 'Hidden quote message',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson($this->tenantUrl('/api/guest-auth/quotes'));

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Owned quote', $response->json('data.0.subject_label'));
    }

    #[Test]
    public function authenticated_guest_can_accept_their_own_linked_quote(): void
    {
        $this->activateQuotesAddon($this->tenant);

        $session = $this->issueGuestSession('accept.quote@example.com');

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'guest_user_id' => $session['guest_id'],
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Accept Guest',
            'guest_email' => 'accept.quote@example.com',
            'subject_label' => 'Accept quote',
            'request_description' => 'Estimate needed.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 15000,
            'total_minor' => 15000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->postJson($this->tenantUrl("/api/guest-auth/quotes/{$quote->id}/accept"));

        $response->assertOk()
            ->assertJsonPath('data.status', Quote::STATUS_ACCEPTED);

        $quote->refresh();
        $this->assertSame(Quote::STATUS_ACCEPTED, $quote->status);
    }

    #[Test]
    public function authenticated_guest_cannot_view_or_accept_another_guests_quote(): void
    {
        $this->activateQuotesAddon($this->tenant);

        $ownerSession = $this->issueGuestSession('owner.quote@example.com');
        $attackerSession = $this->issueGuestSession('attacker.quote@example.com');

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'guest_user_id' => $ownerSession['guest_id'],
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Owner Guest',
            'guest_email' => 'owner.quote@example.com',
            'subject_label' => 'Protected quote',
            'request_description' => 'Estimate needed.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $this->tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 15000,
            'total_minor' => 15000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.$attackerSession['token'])
            ->getJson($this->tenantUrl("/api/guest-auth/quotes/{$quote->id}"))
            ->assertNotFound();

        $this->withHeader('Authorization', 'Bearer '.$attackerSession['token'])
            ->postJson($this->tenantUrl("/api/guest-auth/quotes/{$quote->id}/accept"))
            ->assertNotFound();

        $quote->refresh();
        $this->assertSame(Quote::STATUS_SENT, $quote->status);
    }
}
