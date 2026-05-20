<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Quotes;

use App\Models\Addon;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Models\TenantAddon;
use App\Notifications\Quotes\QuoteSentNotification;
use App\Notifications\Quotes\TenantNewQuoteRequestNotification;
use App\Notifications\Quotes\TenantQuoteLifecycleNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Notification;
use Laravel\Pennant\Feature;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class QuoteNotificationActivityTest extends TestCase
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

    private function activateBookingAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->where('feature_flag', 'booking')->firstOrFail();

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null]
        );

        Feature::for($tenant)->forget('booking');
    }

    private function makeQuoteRequest(Tenant $tenant): QuoteRequest
    {
        return QuoteRequest::query()->create([
            'tenant_id' => (string) $tenant->id,
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'guest_phone' => '0701234567',
            'request_description' => 'Need an estimate for hair treatment.',
            'status' => 'quoted',
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);
    }

    private function makeSentQuote(Tenant $tenant, QuoteRequest $request, array $overrides = []): Quote
    {
        return Quote::query()->create(array_merge([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'sent_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'customer_message' => 'Estimate after inspection.',
            'internal_notes' => 'Complex restorative treatment.',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_SENT,
            'sent_at' => now()->subHour(),
            'valid_until' => now()->addDay(),
        ], $overrides));
    }

    private function assertQuoteActivity(string $tenantId, string $event, string $subjectType, int $subjectId): void
    {
        $activity = TenantActivity::query()
            ->forTenant($tenantId)
            ->where('log_name', 'quotes')
            ->where('event', $event)
            ->where('subject_type', $subjectType)
            ->where('subject_id', $subjectId)
            ->latest('id')
            ->first();

        $this->assertNotNull($activity, "Expected quotes activity '{$event}' for {$subjectType}#{$subjectId}.");
    }

    private function tenantDomainFor(Tenant $tenant): string
    {
        return parse_url($this->url('/', $tenant->slug), PHP_URL_HOST) ?: '';
    }

    protected function setUp(): void
    {
        parent::setUp();

        TenantActivity::query()->delete();
    }

    #[Test]
    public function public_quote_request_submission_notifies_tenant_owner_and_logs_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $owner = TestUsers::tenantOwner('tenant-one');

        $this->postJson($this->url('/api/public/quotes/requests'), [
            'guest_name' => 'Anna Andersson',
            'guest_email' => 'anna@example.com',
            'guest_phone' => '0701234567',
            'request_description' => 'Need an estimate for hair treatment.',
        ])->assertCreated();

        $request = QuoteRequest::query()->latest('id')->firstOrFail();
        $tenantDomain = $this->tenantDomainFor($tenant);

        Notification::assertSentTo(
            $owner,
            TenantNewQuoteRequestNotification::class,
            function (TenantNewQuoteRequestNotification $notification) use ($owner, $request, $tenantDomain): bool {
                return $this->matchesMailMessage(
                    $notification->toMail($owner),
                    subject: 'New quote request received',
                    actionText: 'Review quote request',
                    actionUrl: sprintf('https://%s/cms/quotes/%d', $tenantDomain, $request->id),
                    expectedLines: [
                        'Guest: Anna Andersson (anna@example.com)',
                        'Open the request to prepare a quote and respond.',
                    ],
                );
            }
        );
        $this->assertQuoteActivity((string) $tenant->id, 'submitted', QuoteRequest::class, $request->id);
    }

    #[Test]
    public function draft_quote_creation_logs_activity(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $request = $this->makeQuoteRequest($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/requests/{$request->id}/quotes", 'tenant-one'), [
                'currency' => 'SEK',
                'customer_message' => 'Estimate after inspection.',
                'internal_notes' => 'Complex restorative treatment.',
                'line_items' => [
                    [
                        'label' => 'Hair restoration session',
                        'description' => 'Initial treatment and assessment',
                        'quantity' => 2,
                        'unit_price_minor' => 4500,
                    ],
                ],
            ])
            ->assertCreated();

        $quoteId = (int) $response->json('data.id');

        $this->assertQuoteActivity((string) $tenant->id, 'drafted', Quote::class, $quoteId);
    }

    #[Test]
    public function manual_quote_request_creation_logs_activity(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/quotes/requests', 'tenant-one'), [
                'guest_name' => 'Manual Customer',
                'guest_email' => 'manual@example.com',
                'guest_phone' => '0705551212',
                'request_description' => 'Phone-in quote request.',
            ])
            ->assertCreated();

        $this->assertQuoteActivity((string) $tenant->id, 'submitted', QuoteRequest::class, (int) $response->json('data.id'));
    }

    #[Test]
    public function sending_quote_notifies_guest_and_logs_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $request = $this->makeQuoteRequest($tenant);
        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'created_by_user_id' => TestUsers::tenantOwner('tenant-one')->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'customer_message' => 'Estimate after inspection.',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_DRAFT,
        ]);
        $tenantDomain = $this->tenantDomainFor($tenant);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/send", 'tenant-one'))
            ->assertOk();

        Notification::assertSentOnDemand(
            QuoteSentNotification::class,
            function (QuoteSentNotification $notification, array $channels, AnonymousNotifiable $notifiable) use ($quote, $tenantDomain): bool {
                $mailRoute = $notifiable->routes['mail'] ?? null;

                return $channels === ['mail']
                    && $mailRoute === ['anna@example.com' => 'Anna Andersson']
                    && $this->matchesMailMessage(
                        $notification->toMail($notifiable),
                        subject: 'Your quote is ready',
                        actionText: 'Review quote',
                        actionUrl: $notification->reviewUrl(),
                        expectedLines: ['Use the secure link below to review and accept or reject the quote.'],
                    )
                    && str_starts_with($notification->reviewUrl(), sprintf('https://%s/quotes/', $tenantDomain));
            }
        );
        $this->assertQuoteActivity((string) $tenant->id, 'sent', Quote::class, $quote->id);
    }

    #[Test]
    public function cancelling_quote_logs_activity(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $request = $this->makeQuoteRequest($tenant);
        $quote = $this->makeSentQuote($tenant, $request);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/quotes/{$quote->id}/cancel", 'tenant-one'))
            ->assertOk();

        $this->assertQuoteActivity((string) $tenant->id, 'cancelled', Quote::class, $quote->id);
    }

    #[Test]
    public function accepting_quote_notifies_tenant_owner_and_logs_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $owner = TestUsers::tenantOwner('tenant-one');
        $request = $this->makeQuoteRequest($tenant);
        $quote = $this->makeSentQuote($tenant, $request);
        $tenantDomain = $this->tenantDomainFor($tenant);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/accept"))
            ->assertOk();

        Notification::assertSentTo(
            $owner,
            TenantQuoteLifecycleNotification::class,
            function (TenantQuoteLifecycleNotification $notification) use ($owner, $quote, $tenantDomain): bool {
                return $notification->event === TenantQuoteLifecycleNotification::EVENT_ACCEPTED
                    && $this->matchesMailMessage(
                        $notification->toMail($owner),
                        subject: 'Quote accepted',
                        actionText: 'Open quote',
                        actionUrl: sprintf('https://%s/cms/quotes/%d', $tenantDomain, $quote->quote_request_id),
                        expectedLines: [sprintf('Quote #%d for request #%d is now accepted.', $quote->id, $quote->quote_request_id)],
                    );
            }
        );

        $this->assertQuoteActivity((string) $tenant->id, 'accepted', Quote::class, $quote->id);
    }

    #[Test]
    public function rejecting_quote_notifies_tenant_owner_and_logs_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $owner = TestUsers::tenantOwner('tenant-one');
        $request = $this->makeQuoteRequest($tenant);
        $quote = $this->makeSentQuote($tenant, $request);

        $this->postJson($this->url("/api/public/quotes/{$quote->public_token}/reject"))
            ->assertOk();

        Notification::assertSentTo(
            $owner,
            TenantQuoteLifecycleNotification::class,
            fn (TenantQuoteLifecycleNotification $notification): bool => $notification->event === TenantQuoteLifecycleNotification::EVENT_REJECTED
        );

        $this->assertQuoteActivity((string) $tenant->id, 'rejected', Quote::class, $quote->id);
    }

    #[Test]
    public function expiring_quote_notifies_tenant_owner_and_logs_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $owner = TestUsers::tenantOwner('tenant-one');
        $request = $this->makeQuoteRequest($tenant);
        $quote = $this->makeSentQuote($tenant, $request, [
            'sent_at' => now()->subDays(2),
            'valid_until' => now()->subMinute(),
        ]);

        $this->getJson($this->url("/api/public/quotes/{$quote->public_token}"))
            ->assertOk()
            ->assertJsonPath('data.status', Quote::STATUS_EXPIRED);

        Notification::assertSentTo(
            $owner,
            TenantQuoteLifecycleNotification::class,
            fn (TenantQuoteLifecycleNotification $notification): bool => $notification->event === TenantQuoteLifecycleNotification::EVENT_EXPIRED
        );

        $this->assertQuoteActivity((string) $tenant->id, 'expired', Quote::class, $quote->id);
    }

    #[Test]
    public function converting_quote_notifies_tenant_owner_and_logs_activity(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateQuotesAddon($tenant);
        $this->activateBookingAddon($tenant);
        $owner = TestUsers::tenantOwner('tenant-one');
        $request = $this->makeQuoteRequest($tenant);

        $service = BookingService::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'name' => 'Hair assessment',
        ]);
        $resource = BookingResource::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'name' => 'Room A',
        ]);
        $service->resources()->attach($resource->id);

        $quote = Quote::query()->create([
            'tenant_id' => (string) $tenant->id,
            'quote_request_id' => $request->id,
            'version' => 1,
            'booking_service_id' => $service->id,
            'created_by_user_id' => $owner->id,
            'sent_by_user_id' => $owner->id,
            'currency' => 'SEK',
            'subtotal_minor' => 9000,
            'total_minor' => 9000,
            'customer_message' => 'Estimate after inspection.',
            'internal_notes' => 'Complex restorative treatment.',
            'public_token' => Quote::generateToken(),
            'status' => Quote::STATUS_ACCEPTED,
            'sent_at' => now()->subDay(),
            'accepted_at' => now()->subHour(),
        ]);
        $tenantDomain = $this->tenantDomainFor($tenant);

        $bookingResponse = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/bookings', 'tenant-one'), [
                'service_id' => $service->id,
                'resource_id' => $resource->id,
                'starts_at' => now()->addDay()->setTime(10, 0)->toIso8601String(),
                'ends_at' => now()->addDay()->setTime(11, 0)->toIso8601String(),
                'customer_name' => 'Anna Andersson',
                'customer_email' => 'anna@example.com',
                'customer_phone' => '0701234567',
                'customer_notes' => 'Estimate after inspection.',
                'internal_notes' => 'Complex restorative treatment.',
                'quote_id' => $quote->id,
                'force' => true,
            ])
            ->assertCreated();

        $bookingId = (int) $bookingResponse->json('data.id');

        Notification::assertSentTo(
            $owner,
            TenantQuoteLifecycleNotification::class,
            function (TenantQuoteLifecycleNotification $notification) use ($owner, $quote, $tenantDomain, $bookingId): bool {
                return $notification->event === TenantQuoteLifecycleNotification::EVENT_CONVERTED
                    && $this->matchesMailMessage(
                        $notification->toMail($owner),
                        subject: 'Quote converted',
                        actionText: 'Open quote',
                        actionUrl: sprintf('https://%s/cms/quotes/%d', $tenantDomain, $quote->quote_request_id),
                        expectedLines: [
                            sprintf('Quote #%d for request #%d is now converted.', $quote->id, $quote->quote_request_id),
                            sprintf('Booking #%d was created from this quote.', $bookingId),
                        ],
                    );
            }
        );

        $this->assertQuoteActivity((string) $tenant->id, 'converted', Quote::class, $quote->id);
    }

    private function matchesMailMessage(
        MailMessage $mail,
        string $subject,
        string $actionText,
        string $actionUrl,
        array $expectedLines,
    ): bool {
        return $mail->subject === $subject
            && $mail->actionText === $actionText
            && $mail->actionUrl === $actionUrl
            && collect($expectedLines)->every(fn (string $line): bool => in_array($line, $mail->introLines, true));
    }
}
