<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Quotes;

use App\Models\Addon;
use App\Models\BookingService;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Pennant\Feature;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class PublicQuoteRequestApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('private-media');
    }

    private function url(string $path, string $slug = 'tenant-one'): string
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
            ['activated_at' => now(), 'deactivated_at' => null]
        );

        Feature::for($tenant)->forget('estimates_quotes');
    }

    private function deactivateQuotesAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->where('feature_flag', 'estimates_quotes')->first();
        if ($addon) {
            TenantAddon::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('addon_id', $addon->id)
                ->update(['deactivated_at' => now()->subSecond()]);
        }

        Feature::for($tenant)->forget('estimates_quotes');
    }

    private function issueGuestSession(Tenant $tenant, string $email): string
    {
        $result = app(GuestMagicLinkService::class)->issue(
            $email,
            (string) $tenant->id,
            $this->url('/guest/magic', $tenant->slug),
        );

        $response = $this->postJson($this->url('/api/guest-auth/verify', $tenant->slug), [
            'token' => $result['plainToken'],
        ]);

        $response->assertOk();

        return (string) $response->json('token');
    }

    #[Test]
    public function public_quote_request_endpoint_is_blocked_without_the_addon(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->deactivateQuotesAddon($tenant);

        $this->postJson($this->url('/api/public/quotes/requests'), [
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'request_description' => 'Need help with a service that requires an estimate.',
        ])->assertForbidden();
    }

    #[Test]
    public function guest_can_create_a_tenant_scoped_quote_request(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $service = BookingService::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'name' => 'Hair assessment',
        ]);

        $response = $this->postJson($this->url('/api/public/quotes/requests'), [
            'requested_booking_service_id' => $service->id,
            'guest_name' => '  Alice <b>Example</b>  ',
            'guest_email' => '  alice@example.com  ',
            'guest_phone' => "  +46 70 123 45 67\t",
            'subject_label' => 'Long hair consultation',
            'request_description' => "  Need help with damaged hair and want an estimate.\n\nThanks.  ",
            'preferred_start_at' => '2026-05-20T09:00:00Z',
            'preferred_end_at' => '2026-05-20T12:00:00Z',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.guest_name', 'Alice Example')
            ->assertJsonPath('data.guest_email', 'alice@example.com')
            ->assertJsonPath('data.requested_booking_service_id', $service->id);

        $this->assertDatabaseHas('quote_requests', [
            'tenant_id' => (string) $tenant->id,
            'requested_booking_service_id' => $service->id,
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'guest_phone' => '+46 70 123 45 67',
            'subject_label' => 'Long hair consultation',
            'request_description' => "Need help with damaged hair and want an estimate.\n\nThanks.",
            'status' => 'submitted',
            'origin_surface' => 'public',
        ]);
    }

    #[Test]
    public function authenticated_guest_quote_request_creation_links_guest_user_when_email_matches(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $token = $this->issueGuestSession($tenant, 'linked.quote@example.com');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson($this->url('/api/public/quotes/requests'), [
                'guest_name' => 'Linked Quote Guest',
                'guest_email' => 'linked.quote@example.com',
                'request_description' => 'Need an estimate with guest continuity.',
            ]);

        $response->assertCreated();

        $quoteRequest = \App\Models\QuoteRequest::query()->findOrFail((int) $response->json('data.id'));
        $this->assertSame((string) $tenant->id, $quoteRequest->tenant_id);
        $this->assertSame('linked.quote@example.com', $quoteRequest->guest_email);
        $this->assertNotNull($quoteRequest->guest_user_id);
    }

    #[Test]
    public function guest_cannot_create_a_quote_request_for_another_tenants_booking_service(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateQuotesAddon($tenantOne);
        $this->activateQuotesAddon($tenantTwo);

        $otherTenantService = BookingService::factory()->create([
            'tenant_id' => (string) $tenantTwo->id,
        ]);

        $this->postJson($this->url('/api/public/quotes/requests', 'tenant-one'), [
            'requested_booking_service_id' => $otherTenantService->id,
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'request_description' => 'Need an estimate.',
        ])->assertNotFound();

        $this->assertDatabaseMissing('quote_requests', [
            'tenant_id' => (string) $tenantOne->id,
            'requested_booking_service_id' => $otherTenantService->id,
            'guest_email' => 'alice@example.com',
        ]);
    }

    #[Test]
    public function guest_can_create_a_quote_request_with_private_image_attachments(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $attachment = UploadedFile::fake()->image('damage-photo.jpg', 1200, 800);

        $response = $this->post($this->url('/api/public/quotes/requests'), [
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'request_description' => 'Need an estimate with photo evidence.',
            'attachments' => [$attachment],
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertCreated();

        $quoteRequest = QuoteRequest::query()->findOrFail((int) $response->json('data.id'));
        $media = $quoteRequest->getMedia(QuoteRequest::ATTACHMENTS_COLLECTION);

        $this->assertCount(1, $media);
        $this->assertSame('private-media', $media->first()->disk);
        $this->assertTrue(Storage::disk('private-media')->exists($media->first()->getPathRelativeToRoot()));
    }

    #[Test]
    public function guest_attachment_upload_rejects_unsafe_file_types(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $attachment = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->post($this->url('/api/public/quotes/requests'), [
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'request_description' => 'Need an estimate with attachment.',
            'attachments' => [$attachment],
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attachments.0']);
    }

    #[Test]
    public function public_quote_token_is_tenant_scoped_and_does_not_expose_sensitive_fields(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateQuotesAddon($tenantOne);
        $this->activateQuotesAddon($tenantTwo);

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenantOne->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'request_description' => 'Need an estimate.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenantOne->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'customer_message' => 'Visible customer message',
            'internal_notes' => 'Internal only notes',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $response = $this->getJson($this->url("/api/public/quotes/{$quote->public_token}", 'tenant-one'));

        $response->assertOk()
            ->assertJsonPath('data.id', $quote->id)
            ->assertJsonPath('data.status', Quote::STATUS_SENT);

        $payload = $response->json('data');

        $this->assertIsArray($payload);
        $this->assertArrayNotHasKey('internal_notes', $payload);
        $this->assertArrayNotHasKey('public_token', $payload);

        $this->getJson($this->url("/api/public/quotes/{$quote->public_token}", 'tenant-two'))
            ->assertNotFound();
    }
}
