<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Quotes;

use App\Models\Addon;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Models\TenantAddon;
use Laravel\Pennant\Feature;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PublicQuoteDecisionApiTest extends TestCase
{
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

    #[Test]
    public function guest_can_view_a_sent_quote_by_public_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'customer_message' => 'Estimate after inspection.',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
            'valid_until' => now()->addDays(7),
        ]);

        $quote->lineItems()->create([
            'label' => 'Hair restoration session',
            'description' => 'Initial treatment and assessment',
            'quantity' => 2,
            'unit_price_minor' => 4500,
            'line_total_minor' => 9000,
            'sort_order' => 0,
        ]);

        $this->getJson($this->url("/api/public/quotes/{$quote->public_token}"))
            ->assertOk()
            ->assertJsonPath('data.id', $quote->id)
            ->assertJsonPath('data.status', Quote::STATUS_SENT)
            ->assertJsonPath('data.total_minor', 9000)
            ->assertJsonPath('data.customer_message', 'Estimate after inspection.')
            ->assertJsonPath('data.line_items.0.label', 'Hair restoration session')
            ->assertJsonMissingPath('data.public_token');
    }

    #[Test]
    public function invalid_public_quote_token_returns_not_found(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $this->getJson($this->url('/api/public/quotes/totally-invalid-token'))
            ->assertNotFound();
    }

    #[Test]
    public function draft_quotes_are_not_publicly_viewable_by_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_DRAFT,
        ]);

        $this->getJson($this->url("/api/public/quotes/{$quote->public_token}"))
            ->assertNotFound();
    }

    #[Test]
    public function sent_quote_is_marked_expired_when_viewed_after_valid_until(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now()->subDays(2),
            'valid_until' => now()->subMinute(),
        ]);

        $this->getJson($this->url("/api/public/quotes/{$quote->public_token}"))
            ->assertOk()
            ->assertJsonPath('data.status', Quote::STATUS_EXPIRED)
            ->assertJsonPath('data.expired_at', fn (mixed $value) => is_string($value) && $value !== '');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_EXPIRED, $quote->status);
        $this->assertNotNull($quote->expired_at);
    }

    #[Test]
    public function guest_can_accept_a_sent_quote_by_public_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/accept"))
            ->assertOk()
            ->assertJsonPath('data.id', $quote->id)
            ->assertJsonPath('data.status', Quote::STATUS_ACCEPTED)
            ->assertJsonPath('data.accepted_at', fn (mixed $value) => is_string($value) && $value !== '');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_ACCEPTED, $quote->status);
        $this->assertNotNull($quote->accepted_at);
    }

    #[Test]
    public function accepting_an_already_accepted_quote_is_idempotent(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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

        $acceptedAt = now()->subMinute();

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_ACCEPTED,
            'sent_at' => now()->subHour(),
            'accepted_at' => $acceptedAt,
        ]);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/accept"))
            ->assertOk()
            ->assertJsonPath('data.status', Quote::STATUS_ACCEPTED)
            ->assertJsonPath('data.accepted_at', $acceptedAt->toIso8601String());
    }

    #[Test]
    public function expired_sent_quote_cannot_be_accepted(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now()->subDays(2),
            'valid_until' => now()->subMinute(),
        ]);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/accept"))
            ->assertStatus(422)
            ->assertJsonPath('message', 'This quote has expired.');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_EXPIRED, $quote->status);
        $this->assertNotNull($quote->expired_at);
    }

    #[Test]
    public function guest_can_reject_a_sent_quote_by_public_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/reject"))
            ->assertOk()
            ->assertJsonPath('data.id', $quote->id)
            ->assertJsonPath('data.status', Quote::STATUS_REJECTED)
            ->assertJsonPath('data.rejected_at', fn (mixed $value) => is_string($value) && $value !== '');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_REJECTED, $quote->status);
        $this->assertNotNull($quote->rejected_at);
    }

    #[Test]
    public function rejecting_an_already_rejected_quote_is_idempotent(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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

        $rejectedAt = now()->subMinute();

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_REJECTED,
            'sent_at' => now()->subHour(),
            'rejected_at' => $rejectedAt,
        ]);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/reject"))
            ->assertOk()
            ->assertJsonPath('data.status', Quote::STATUS_REJECTED)
            ->assertJsonPath('data.rejected_at', $rejectedAt->toIso8601String());
    }

    #[Test]
    public function expired_sent_quote_cannot_be_rejected(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

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
            'created_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => \Tests\Support\TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now()->subDays(2),
            'valid_until' => now()->subMinute(),
        ]);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/reject"))
            ->assertStatus(422)
            ->assertJsonPath('message', 'This quote has expired.');

        $quote->refresh();

        $this->assertSame(Quote::STATUS_EXPIRED, $quote->status);
        $this->assertNotNull($quote->expired_at);
    }
}
