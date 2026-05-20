<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Quotes;

use App\Models\Addon;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Models\TenantAddon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Pennant\Feature;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class QuoteCmsApiTest extends TestCase
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

    #[Test]
    public function cms_quote_requests_are_blocked_without_the_addon(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->deactivateQuotesAddon($tenant);

        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url('/api/quotes/requests'))
            ->assertForbidden();
    }

    #[Test]
    public function viewer_can_list_only_the_current_tenants_quote_requests(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateQuotesAddon($tenantOne);
        $this->activateQuotesAddon($tenantTwo);

        $visible = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenantOne->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        QuoteRequest::query()->create([
            'tenant_id' => (string) $tenantTwo->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Other Tenant',
            'guest_email' => 'other@example.com',
            'request_description' => 'Should not leak.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $response = $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->url('/api/quotes/requests', 'tenant-one'));

        $response->assertOk()
            ->assertJsonFragment([
                'id' => $visible->id,
                'guest_name' => 'Anna Andersson',
                'status' => QuoteRequest::STATUS_SUBMITTED,
            ])
            ->assertJsonMissing([
                'guest_name' => 'Other Tenant',
            ]);
    }

    #[Test]
    public function viewer_can_read_quote_request_detail_for_the_current_tenant(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->url("/api/quotes/requests/{$request->id}", 'tenant-one'))
            ->assertOk()
            ->assertJsonPath('data.id', $request->id)
            ->assertJsonPath('data.guest_name', 'Anna Andersson')
            ->assertJsonPath('data.latest_quote', null);
    }

    #[Test]
    public function owner_can_view_and_download_quote_request_attachments(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        tenancy()->initialize($tenant);
        $attachment = $request->addMedia(UploadedFile::fake()->image('reference-photo.jpg', 1200, 800))
            ->toMediaCollection(QuoteRequest::ATTACHMENTS_COLLECTION);
        tenancy()->end();

        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/quotes/requests/{$request->id}", 'tenant-one'))
            ->assertOk()
            ->assertJsonPath('data.attachments.0.id', $attachment->id)
            ->assertJsonPath('data.attachments.0.file_name', $attachment->file_name)
            ->assertJsonPath('data.attachments.0.mime_type', $attachment->mime_type);

        $this->actingAsTenantOwner('tenant-one')
            ->get($this->url("/api/quotes/requests/{$request->id}/attachments/{$attachment->id}/download", 'tenant-one'))
            ->assertOk();
    }

    #[Test]
    public function owner_can_create_a_manual_quote_request(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/quotes/requests', 'tenant-one'), [
                'guest_name' => 'Manual Customer',
                'guest_email' => 'manual@example.com',
                'guest_phone' => '0705551212',
                'subject_label' => 'Phone consultation',
                'request_description' => 'Customer called and wants an estimate before booking.',
                'preferred_start_at' => now()->addDays(3)->toIso8601String(),
                'preferred_end_at' => now()->addDays(5)->toIso8601String(),
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.origin_surface', QuoteRequest::ORIGIN_MANUAL)
            ->assertJsonPath('data.guest_name', 'Manual Customer')
            ->assertJsonPath('data.status', QuoteRequest::STATUS_SUBMITTED);

        $this->assertDatabaseHas('quote_requests', [
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_MANUAL,
            'guest_email' => 'manual@example.com',
            'status' => QuoteRequest::STATUS_SUBMITTED,
        ]);
    }

    #[Test]
    public function owner_can_create_a_draft_quote_and_totals_are_computed_server_side(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/requests/{$request->id}/quotes", 'tenant-one'), [
                'currency' => 'SEK',
                'estimated_duration_minutes' => 150,
                'customer_message' => 'Estimate after hair inspection.',
                'internal_notes' => 'Complex restorative treatment.',
                'valid_until' => now()->addDays(7)->toISOString(),
                'subtotal_minor' => 1,
                'total_minor' => 1,
                'line_items' => [
                    [
                        'label' => 'Hair restoration session',
                        'description' => 'Initial treatment and assessment',
                        'quantity' => 2,
                        'unit_price_minor' => 4500,
                        'line_total_minor' => 1,
                    ],
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', Quote::STATUS_DRAFT)
            ->assertJsonPath('data.subtotal_minor', 9000)
            ->assertJsonPath('data.total_minor', 9000)
            ->assertJsonPath('data.line_items.0.line_total_minor', 9000);

        $this->assertDatabaseHas('quotes', [
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'status' => Quote::STATUS_DRAFT,
        ]);

        $this->assertDatabaseHas('quote_line_items', [
            'label' => 'Hair restoration session',
            'quantity' => '2.00',
            'unit_price_minor' => 4500,
            'line_total_minor' => 9000,
        ]);
    }

    #[Test]
    public function viewer_cannot_create_a_draft_quote(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->url("/api/quotes/requests/{$request->id}/quotes", 'tenant-one'), [
                'currency' => 'SEK',
                'line_items' => [
                    [
                        'label' => 'Hair restoration session',
                        'quantity' => 1,
                        'unit_price_minor' => 4500,
                    ],
                ],
            ])
            ->assertForbidden();
    }

    #[Test]
    public function owner_can_send_a_draft_quote(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_DRAFT,
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/send", 'tenant-one'));

        $response->assertOk()
            ->assertJsonPath('data.id', $quote->id)
            ->assertJsonPath('data.status', Quote::STATUS_SENT)
            ->assertJsonPath('data.sent_at', fn (mixed $value) => is_string($value) && $value !== '');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_SENT, $quote->status);
        $this->assertNotNull($quote->sent_at);
        $this->assertSame($ownerId, $quote->sent_by_user_id);
        $this->assertNotNull($quote->public_token_hash);
    }

    #[Test]
    public function viewer_cannot_send_a_quote(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_DRAFT,
        ]);

        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/send", 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function only_draft_quotes_can_be_sent(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'sent_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/send", 'tenant-one'))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only draft quotes can be sent.');
    }

    #[Test]
    public function owner_can_cancel_a_sent_quote(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'sent_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/cancel", 'tenant-one'))
            ->assertOk()
            ->assertJsonPath('data.status', Quote::STATUS_CANCELLED)
            ->assertJsonPath('data.cancelled_at', fn (mixed $value) => is_string($value) && $value !== '');

        $this->assertDatabaseHas('quotes', [
            'id' => $quote->id,
            'status' => Quote::STATUS_CANCELLED,
        ]);
    }

    #[Test]
    public function owner_can_delete_a_draft_quote_and_request_reverts_to_submitted_when_none_remain(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_MANUAL,
            'guest_name' => 'Manual Customer',
            'guest_email' => 'manual@example.com',
            'request_description' => 'Phone-in quote request.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_DRAFT,
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/quotes/{$quote->id}", 'tenant-one'))
            ->assertNoContent();

        $this->assertDatabaseMissing('quotes', [
            'id' => $quote->id,
        ]);

        $request->refresh();
        $this->assertSame(QuoteRequest::STATUS_SUBMITTED, $request->status);
    }

    #[Test]
    public function owner_can_get_booking_prefill_for_an_accepted_quote(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'requested_booking_service_id' => null,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'guest_phone' => '0701234567',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $service = \App\Models\BookingService::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'name' => 'Hair assessment',
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'booking_service_id' => $service->id,
            'created_by_user_id' => $ownerId,
            'sent_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'customer_message' => 'Estimate after inspection.',
            'internal_notes' => 'Complex restorative treatment.',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_ACCEPTED,
            'sent_at' => now()->subDay(),
            'accepted_at' => now(),
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/convert-to-booking", 'tenant-one'))
            ->assertOk()
            ->assertJsonPath('data.quote_id', $quote->id)
            ->assertJsonPath('data.service_id', $service->id)
            ->assertJsonPath('data.customer_name', 'Anna Andersson')
            ->assertJsonPath('data.customer_email', 'anna@example.com')
            ->assertJsonPath('data.customer_phone', '0701234567')
            ->assertJsonPath('data.customer_notes', 'Estimate after inspection.')
            ->assertJsonPath('data.internal_notes', 'Complex restorative treatment.');
    }

    #[Test]
    public function viewer_cannot_start_booking_conversion_for_a_quote(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'sent_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_ACCEPTED,
            'sent_at' => now()->subDay(),
            'accepted_at' => now(),
        ]);

        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/convert-to-booking", 'tenant-one'))
            ->assertForbidden();
    }

    #[Test]
    public function only_accepted_quotes_can_be_converted_to_booking_prefill(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'sent_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now()->subDay(),
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/convert-to-booking", 'tenant-one'))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only accepted quotes can be converted to a booking.');
    }

    #[Test]
    public function expired_sent_quote_is_exposed_as_expired_in_cms_detail(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $ownerId = \Tests\Support\TestUsers::tenantOwner('tenant-one')->id;

        $request = QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => $ownerId,
            'sent_by_user_id' => $ownerId,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now()->subDays(2),
            'valid_until' => now()->subMinute(),
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/quotes/requests/{$request->id}", 'tenant-one'))
            ->assertOk()
            ->assertJsonPath('data.latest_quote.id', $quote->id)
            ->assertJsonPath('data.latest_quote.status', Quote::STATUS_EXPIRED)
            ->assertJsonPath('data.latest_quote.expired_at', fn (mixed $value) => is_string($value) && $value !== '');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_EXPIRED, $quote->status);
        $this->assertNotNull($quote->expired_at);
    }
}
