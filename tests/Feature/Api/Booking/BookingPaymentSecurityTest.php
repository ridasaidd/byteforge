<?php

declare(strict_types=1);

namespace Tests\Feature\Api\Booking;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Models\TenantPaymentProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Security regression suite for the Booking × Payment integration.
 *
 * Each test is written in "failing-first" style: it describes what the system
 * MUST guarantee. Running these against unfixed code should produce failures;
 * passing means the guarantee holds.
 *
 * Coverage categories (OWASP-aligned):
 *  A01 – Broken Access Control (IDOR, tenant isolation, CMS auth)
 *  A02 – Cryptographic Failures (secret key exposure in public responses)
 *  A03 – Injection / Input Validation (negative price, oversized strings)
 *  A07 – Auth & Access (unauthenticated CMS access)
 *  A08 – Software Integrity (webhook signature verification)
 */
class BookingPaymentSecurityTest extends TestCase
{
    private Tenant $tenantOne;
    private Tenant $tenantTwo;

    // ─── Setup ───────────────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateBookingAddon($this->tenantOne);
        $this->activateBookingAddon($this->tenantTwo);
    }

    private function activateBookingAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'booking'],
            [
                'name'            => 'Booking',
                'description'     => 'Booking system',
                'stripe_price_id' => 'price_booking_placeholder',
                'price_monthly'   => 4900,
                'currency'        => 'SEK',
                'feature_flag'    => 'booking',
                'is_active'       => true,
                'sort_order'      => 10,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null]
        );
    }

    private function url(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    private function makeResourceForTenant(Tenant $tenant): BookingResource
    {
        return BookingResource::factory()->create([
            'tenant_id' => (string) $tenant->id,
        ]);
    }

    private function makeServiceForTenant(Tenant $tenant, array $overrides = []): BookingService
    {
        return BookingService::factory()->create(array_merge([
            'tenant_id' => (string) $tenant->id,
            'booking_mode' => BookingService::MODE_SLOT,
            'duration_minutes' => 30,
        ], $overrides));
    }

    private function makeBookingForTenant(Tenant $tenant, array $overrides = []): Booking
    {
        $resource = $this->makeResourceForTenant($tenant);
        $service = $this->makeServiceForTenant($tenant);
        $service->resources()->syncWithoutDetaching([$resource->id]);

        return Booking::factory()->create(array_merge([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
        ], $overrides));
    }

    private function upsertStripeProvider(Tenant $tenant, array $credentials = []): TenantPaymentProvider
    {
        return TenantPaymentProvider::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'provider' => 'stripe',
            ],
            [
                'credentials' => array_merge([
                    'publishable_key' => 'pk_test_123',
                    'secret_key' => 'sk_test_123',
                    'webhook_secret' => 'whsec_123',
                ], $credentials),
                'is_active' => true,
                'mode' => 'test',
            ]
        );
    }

    private function stripeSignatureHeader(string $payload, string $secret): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);

        return sprintf('t=%d,v1=%s', $timestamp, $signature);
    }

    // =========================================================================
    // A07 — Authentication: Unauthenticated access to CMS booking endpoints
    // =========================================================================

    /**
     * A07: Every CMS booking management endpoint must reject unauthenticated
     * requests with 401. A missing auth token must never fall through to data.
     */
    public function test_unauthenticated_cms_booking_endpoints_return_401(): void
    {
        $booking = $this->makeBookingForTenant($this->tenantOne);

        $endpoints = [
            ['GET',   "/api/booking/bookings"],
            ['GET',   "/api/booking/bookings/{$booking->id}"],
            ['PATCH', "/api/booking/bookings/{$booking->id}/confirm"],
            ['PATCH', "/api/booking/bookings/{$booking->id}/cancel"],
            ['PATCH', "/api/booking/bookings/{$booking->id}/reschedule"],
            ['GET',   "/api/booking/services"],
            ['POST',  "/api/booking/services"],
            ['GET',   "/api/booking/resources"],
            ['POST',  "/api/booking/resources"],
        ];

        foreach ($endpoints as [$method, $path]) {
            $response = $this->json($method, $this->url($path), []);
            $this->assertContains(
                $response->getStatusCode(),
                [401, 403],
                "Expected 401/403 for unauthenticated {$method} {$path}, got {$response->getStatusCode()}"
            );
        }
    }

    // =========================================================================
    // A01 — Broken Access Control: Cross-tenant IDOR via CMS endpoints
    // =========================================================================

    /**
     * A01/IDOR: An authenticated tenant-one user must not be able to read a
     * booking that belongs to tenant-two via the CMS list or detail endpoints.
     *
     * The `resolveBooking()` helper already uses `forTenant()`, so this is a
     * regression guard — any future refactor that removes the scope would be
     * caught immediately.
     */
    public function test_cms_cannot_read_another_tenants_booking(): void
    {
        $tenantTwoBooking = $this->makeBookingForTenant($this->tenantTwo);

        // Authenticated as tenant-one owner
        $this->actingAsTenantOwner('tenant-one');

        // Attempt to GET the booking by ID — must 404
        $response = $this->getJson($this->url("/api/booking/bookings/{$tenantTwoBooking->id}"));
        $response->assertStatus(404);
    }

    /**
     * A01/IDOR: An authenticated tenant-one user must not be able to cancel a
     * booking that belongs to tenant-two via the CMS cancel endpoint.
     */
    public function test_cms_cannot_cancel_another_tenants_booking(): void
    {
        $tenantTwoBooking = $this->makeBookingForTenant($this->tenantTwo, [
            'status'    => Booking::STATUS_CONFIRMED,
        ]);

        $this->actingAsTenantOwner('tenant-one');

        $response = $this->patchJson(
            $this->url("/api/booking/bookings/{$tenantTwoBooking->id}/cancel"),
            ['note' => 'trying to cancel another tenant\'s booking']
        );
        $response->assertStatus(404);

        // Booking must remain unchanged
        $tenantTwoBooking->refresh();
        $this->assertEquals(Booking::STATUS_CONFIRMED, $tenantTwoBooking->status);
    }

    /**
     * A01/IDOR: A guest using a valid management token from tenant-two must not
     * be able to view or cancel that booking on tenant-one's domain. The public
     * endpoint must scope the token lookup to the current tenant.
     */
    public function test_public_token_is_scoped_to_issuing_tenant(): void
    {
        $tenantTwoBooking = $this->makeBookingForTenant($this->tenantTwo, [
            'status'           => Booking::STATUS_CONFIRMED,
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addDays(7),
        ]);

        $token = $tenantTwoBooking->management_token;

        // Attempt to GET the booking on tenant-ONE's domain using tenant-TWO's token
        $showResponse = $this->getJson($this->url("/api/public/booking/{$token}", 'tenant-one'));
        $showResponse->assertStatus(404);

        // Attempt to CANCEL on tenant-ONE's domain
        $cancelResponse = $this->patchJson($this->url("/api/public/booking/{$token}/cancel", 'tenant-one'));
        $cancelResponse->assertStatus(404);

        // The booking itself must be untouched
        $tenantTwoBooking->refresh();
        $this->assertEquals(Booking::STATUS_CONFIRMED, $tenantTwoBooking->status);
    }

    /**
     * A01/IDOR: A guest must not be able to load tenant-two's payment session
     * from tenant-one's domain using a valid management token.
     */
    public function test_public_payment_session_token_is_scoped_to_issuing_tenant(): void
    {
        $payment = Payment::factory()->create([
            'tenant_id' => (string) $this->tenantTwo->id,
            'provider' => 'stripe',
            'status' => Payment::STATUS_PROCESSING,
            'provider_response' => [
                'client_secret' => 'pi_cross_tenant_secret',
            ],
        ]);

        $tenantTwoBooking = $this->makeBookingForTenant($this->tenantTwo, [
            'status' => Booking::STATUS_AWAITING_PAYMENT,
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addDays(7),
            'payment_id' => $payment->id,
        ]);

        $response = $this->getJson(
            $this->url("/api/public/booking/payment/{$tenantTwoBooking->management_token}", 'tenant-one')
        );

        $response->assertStatus(404);
    }

    // =========================================================================
    // A02 — Sensitive Data Exposure: Stripe secret key must never leave server
    // =========================================================================

    /**
     * A02: When a booking transitions to `awaiting_payment`, the JSON response
     * returned to the guest must contain the publishable_key (needed by
     * Stripe.js) but must NEVER contain the secret_key or webhook_secret.
     *
     * Stripe's secret key would allow the recipient to create charges and read
     * all payment data for the tenant.
     */
    public function test_payment_response_never_exposes_stripe_secret_key(): void
    {
        tenancy()->initialize($this->tenantOne);

        $resource = BookingResource::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
        ]);

        $service = BookingService::factory()->create([
            'tenant_id'        => (string) $this->tenantOne->id,
            'booking_mode'     => BookingService::MODE_SLOT,
            'duration_minutes' => 30,
            'price'            => 499.00,
            'currency'         => 'SEK',
            'requires_payment' => true,
        ]);
        $service->resources()->attach($resource->id);

        $this->upsertStripeProvider($this->tenantOne, [
            'publishable_key' => 'pk_test_VISIBLE',
            'secret_key' => 'sk_test_MUST_NOT_APPEAR',
            'webhook_secret' => 'whsec_MUST_NOT_APPEAR',
        ]);

        $booking = Booking::factory()->create([
            'tenant_id'        => (string) $this->tenantOne->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'status'           => Booking::STATUS_PENDING_HOLD,
            'hold_expires_at'  => now()->addMinutes(10),
            'management_token' => Booking::generateToken(),
        ]);

        $response = $this->postJson(
            $this->url("/api/public/booking/hold/{$booking->management_token}")
        );

        $response->assertStatus(200);

        $body = $response->getContent();

        $this->assertStringNotContainsString(
            'sk_test_MUST_NOT_APPEAR',
            $body,
            'Stripe secret_key must never appear in a public API response'
        );
        $this->assertStringNotContainsString(
            'whsec_MUST_NOT_APPEAR',
            $body,
            'Stripe webhook_secret must never appear in a public API response'
        );
    }

    // =========================================================================
    // A08 — Software/Data Integrity: Webhook signature validation
    // =========================================================================

    /**
     * A08: A Stripe webhook request without a valid Stripe-Signature header
     * must be rejected with 400. Accepting unsigned callbacks would allow any
     * attacker to forge payment success events and get bookings confirmed
     * for free.
     */
    public function test_stripe_webhook_without_signature_is_rejected(): void
    {
        $this->upsertStripeProvider($this->tenantOne, [
            'publishable_key' => 'pk_test_123',
            'secret_key' => 'sk_test_123',
            'webhook_secret' => 'whsec_real_secret',
        ]);

        // Send a plausible-looking Stripe payload but NO Stripe-Signature header
        $response = $this->postJson(
            $this->url('/api/payments/stripe/webhook'),
            [
                'type' => 'payment_intent.succeeded',
                'data' => ['object' => ['id' => 'pi_fake_123', 'status' => 'succeeded']],
            ]
        );

        $response->assertStatus(400);
    }

    /**
     * A08: A malformed booking reference in payment metadata must not trigger
     * booking confirmation when a webhook marks the payment completed.
     */
    public function test_stripe_webhook_ignores_malformed_booking_reference(): void
    {
        $provider = $this->upsertStripeProvider($this->tenantOne, [
            'publishable_key' => 'pk_test_123',
            'secret_key' => 'sk_test_123',
            'webhook_secret' => 'whsec_booking_reference',
        ]);

        $booking = $this->makeBookingForTenant($this->tenantOne, [
            'status' => Booking::STATUS_AWAITING_PAYMENT,
        ]);

        $payment = Payment::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_booking_reference_123',
            'status' => Payment::STATUS_PROCESSING,
            'metadata' => ['reference' => 'booking:not-a-number'],
        ]);

        $booking->update(['payment_id' => $payment->id]);

        $payload = json_encode([
            'id' => 'evt_booking_reference_1',
            'object' => 'event',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_booking_reference_123',
                    'status' => 'succeeded',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            $this->url('/api/payments/stripe/webhook'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
                'HTTP_STRIPE_SIGNATURE' => $this->stripeSignatureHeader(
                    $payload,
                    (string) data_get($provider->credentials, 'webhook_secret')
                ),
            ],
            $payload,
        );

        $response->assertOk();

        $booking->refresh();
        $payment->refresh();

        $this->assertSame(Booking::STATUS_AWAITING_PAYMENT, $booking->status);
        $this->assertSame(Payment::STATUS_COMPLETED, $payment->status);
    }

    /**
     * A08: A Swish callback without being verifiable via Swish's own status API
     * (503 from their side) must be rejected rather than processed.
     * This ensures we never trust the raw callback payload.
     */
    public function test_swish_callback_without_verifiable_status_is_rejected(): void
    {
        TenantPaymentProvider::factory()->create([
            'tenant_id'   => (string) $this->tenantOne->id,
            'provider'    => 'swish',
            'credentials' => ['merchant_msisdn' => '1231181189'],
            'is_active'   => true,
        ]);

        // The SwishGateway will try to call the Swish status API, which will fail
        // in the test environment — the controller should return 503 not 200.
        $response = $this->postJson(
            $this->url('/api/payments/swish/callback'),
            ['id' => 'FAKE-UUID', 'status' => 'PAID', 'payeePaymentReference' => 'ref123']
        );

        // Must not silently accept an unverified callback
        $this->assertNotEquals(
            200,
            $response->getStatusCode(),
            'Swish callback with unverifiable status must not return 200'
        );
    }

    // =========================================================================
    // A01 — Broken Access Control: Expired management token
    // =========================================================================

    /**
     * A01: A guest must not be able to cancel a booking using a management token
     * that has already expired. The system must return 410 Gone.
     */
    public function test_expired_management_token_is_rejected_with_410(): void
    {
        $booking = $this->makeBookingForTenant($this->tenantOne, [
            'status'           => Booking::STATUS_CONFIRMED,
            'management_token' => Booking::generateToken(),
            // Token already expired
            'token_expires_at' => now()->subHours(1),
        ]);

        $response = $this->patchJson(
            $this->url("/api/public/booking/{$booking->management_token}/cancel")
        );

        $response->assertStatus(410);

        // Booking must not be cancelled
        $booking->refresh();
        $this->assertEquals(Booking::STATUS_CONFIRMED, $booking->status);
    }

    /**
     * A01: An expired management token must not allow access to the guest
     * payment session endpoint.
     */
    public function test_expired_management_token_cannot_access_payment_session(): void
    {
        $payment = Payment::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
            'provider' => 'stripe',
            'status' => Payment::STATUS_PROCESSING,
            'provider_response' => [
                'client_secret' => 'pi_expired_secret',
            ],
        ]);

        $booking = $this->makeBookingForTenant($this->tenantOne, [
            'status' => Booking::STATUS_AWAITING_PAYMENT,
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->subHour(),
            'payment_id' => $payment->id,
        ]);

        $response = $this->getJson(
            $this->url("/api/public/booking/payment/{$booking->management_token}")
        );

        $response->assertStatus(410);
    }

    /**
     * A02: The guest payment page URL must place the management token in the
     * fragment, not in the request path, to reduce log and referrer exposure.
     */
    public function test_payment_handoff_url_uses_fragment_token_instead_of_path_token(): void
    {
        tenancy()->initialize($this->tenantOne);

        $resource = BookingResource::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
        ]);

        $service = BookingService::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
            'booking_mode' => BookingService::MODE_SLOT,
            'duration_minutes' => 30,
            'price' => 499.00,
            'currency' => 'SEK',
            'requires_payment' => true,
        ]);
        $service->resources()->attach($resource->id);

        $this->upsertStripeProvider($this->tenantOne, [
            'publishable_key' => 'pk_test_VISIBLE',
            'secret_key' => 'sk_test_MUST_NOT_APPEAR',
        ]);

        $booking = Booking::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_PENDING_HOLD,
            'hold_expires_at' => now()->addMinutes(10),
            'management_token' => Booking::generateToken(),
        ]);

        $response = $this->postJson(
            $this->url("/api/public/booking/hold/{$booking->management_token}")
        );

        $response->assertStatus(200);
        $response->assertJsonPath(
            'data.payment_url',
            $this->url('/booking/payment') . '#token=' . $booking->management_token
        );
    }

    /**
     * A01/tenant isolation: a forged foreign-tenant booking row referencing the
     * current tenant's resource must not block public slot availability.
     */
    public function test_foreign_tenant_booking_row_does_not_block_slot_availability(): void
    {
        $resource = $this->makeResourceForTenant($this->tenantOne);
        $service = $this->makeServiceForTenant($this->tenantOne, [
            'booking_mode' => BookingService::MODE_SLOT,
            'duration_minutes' => 60,
            'slot_interval_minutes' => 60,
        ]);
        $service->resources()->syncWithoutDetaching([$resource->id]);

        $date = now()->addDays(5)->format('Y-m-d');

        BookingAvailability::create([
            'resource_id' => $resource->id,
            'specific_date' => $date,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
            'is_blocked' => false,
        ]);

        $tenantTwoService = $this->makeServiceForTenant($this->tenantTwo, [
            'booking_mode' => BookingService::MODE_SLOT,
            'duration_minutes' => 60,
        ]);

        Booking::factory()->create([
            'tenant_id' => (string) $this->tenantTwo->id,
            'service_id' => $tenantTwoService->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => "{$date} 09:00:00",
            'ends_at' => "{$date} 10:00:00",
        ]);

        $response = $this->getJson(
            $this->url("/api/public/booking/slots?service_id={$service->id}&resource_id={$resource->id}&date={$date}")
        );

        $response->assertOk();
        $slot = collect($response->json('data'))->first(
            fn (array $item) => str_contains((string) ($item['starts_at'] ?? ''), 'T09:00:00')
        );

        $this->assertNotNull($slot);
        $this->assertTrue((bool) ($slot['available'] ?? false));
    }

    /**
     * A01/tenant isolation: a forged foreign-tenant booking row referencing the
     * current tenant's resource must not block range availability checks.
     */
    public function test_foreign_tenant_booking_row_does_not_block_range_availability(): void
    {
        $resource = $this->makeResourceForTenant($this->tenantOne);
        $service = $this->makeServiceForTenant($this->tenantOne, [
            'booking_mode' => BookingService::MODE_RANGE,
        ]);
        $service->resources()->syncWithoutDetaching([$resource->id]);

        for ($day = 0; $day <= 6; $day++) {
            BookingAvailability::create([
                'resource_id' => $resource->id,
                'day_of_week' => $day,
                'starts_at' => '00:00:00',
                'ends_at' => '23:59:00',
                'is_blocked' => false,
            ]);
        }

        $checkIn = now()->addDays(7)->format('Y-m-d');
        $checkOut = now()->addDays(9)->format('Y-m-d');

        $tenantTwoService = $this->makeServiceForTenant($this->tenantTwo, [
            'booking_mode' => BookingService::MODE_RANGE,
        ]);

        Booking::factory()->create([
            'tenant_id' => (string) $this->tenantTwo->id,
            'service_id' => $tenantTwoService->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => "{$checkIn} 15:00:00",
            'ends_at' => "{$checkOut} 11:00:00",
        ]);

        $response = $this->getJson(
            $this->url(
                "/api/public/booking/availability?service_id={$service->id}&resource_id={$resource->id}&check_in={$checkIn}&check_out={$checkOut}"
            )
        );

        $response->assertOk();
        $response->assertJsonPath('available', true);
    }

    // =========================================================================
    // A03 — Input Validation: Reject invalid service configuration
    // =========================================================================

    /**
     * A03: Creating a booking service with a negative price must be rejected
     * with 422. Negative prices could corrupt billing calculations.
     */
    public function test_booking_service_rejects_negative_price(): void
    {
        $this->actingAsTenantOwner('tenant-one');

        $response = $this->postJson($this->url('/api/booking/services'), [
            'name'             => 'Evil Discount',
            'booking_mode'     => 'slot',
            'duration_minutes' => 30,
            'price'            => -100.00,
            'currency'         => 'SEK',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['price']);
    }

    /**
     * A03: A booking service with `requires_payment = true` but no price (or
     * price = 0) must NOT trigger payment processing. The system must treat it
     * as free, preventing a 0-amount charge from reaching the payment provider.
     */
    public function test_requires_payment_with_zero_price_never_initiates_payment(): void
    {
        tenancy()->initialize($this->tenantOne);

        $this->upsertStripeProvider($this->tenantOne);

        // Service flags requires_payment but has price = 0
        $service = BookingService::factory()->create([
            'tenant_id'        => (string) $this->tenantOne->id,
            'booking_mode'     => BookingService::MODE_SLOT,
            'duration_minutes' => 30,
            'price'            => 0,
            'currency'         => 'SEK',
            'requires_payment' => true,
        ]);

        $resource = BookingResource::factory()->create([
            'tenant_id' => (string) $this->tenantOne->id,
        ]);
        $service->resources()->attach($resource->id);

        $booking = Booking::factory()->create([
            'tenant_id'        => (string) $this->tenantOne->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'status'           => Booking::STATUS_PENDING_HOLD,
            'hold_expires_at'  => now()->addMinutes(10),
            'management_token' => Booking::generateToken(),
        ]);

        $response = $this->postJson(
            $this->url("/api/public/booking/hold/{$booking->management_token}")
        );

        $response->assertStatus(200);

        // Must NOT transition to awaiting_payment — should proceed to pending/confirmed
        $booking->refresh();
        $this->assertNotEquals(
            Booking::STATUS_AWAITING_PAYMENT,
            $booking->status,
            'A zero-price service must never initiate a payment, even with requires_payment=true'
        );
        $this->assertNull(
            $booking->payment_id,
            'No payment record must be created for a zero-price service'
        );
    }

    /**
     * A03: Booking service name must not be storable as a very long string
     * that could overflow column limits or cause downstream issues.
     */
    public function test_booking_service_name_length_is_enforced(): void
    {
        $this->actingAsTenantOwner('tenant-one');

        $response = $this->postJson($this->url('/api/booking/services'), [
            'name'             => str_repeat('A', 300),
            'booking_mode'     => 'slot',
            'duration_minutes' => 30,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }
}
