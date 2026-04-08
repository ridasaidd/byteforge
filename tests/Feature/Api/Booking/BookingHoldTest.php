<?php

namespace Tests\Feature\Api\Booking;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Notifications\Booking\BookingReceivedNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingHoldTest extends TestCase
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function url(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
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

    private function makeService(string $tenantId, array $overrides = []): BookingService
    {
        return BookingService::factory()->create(array_merge([
            'tenant_id'    => $tenantId,
            'booking_mode' => BookingService::MODE_SLOT,
        ], $overrides));
    }

    private function makeResource(string $tenantId, array $overrides = []): BookingResource
    {
        return BookingResource::factory()->create(array_merge([
            'tenant_id' => $tenantId,
        ], $overrides));
    }

    private function makeAvailability(BookingResource $resource): void
    {
        BookingAvailability::factory()->create([
            'resource_id' => $resource->id,
            'day_of_week' => now()->addDay()->dayOfWeek,
            'starts_at'   => '00:00',
            'ends_at'     => '23:59',
            'is_blocked'  => false,
        ]);
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    #[Test]
    public function hold_creates_pending_hold_booking(): void
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['duration_minutes' => 60]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);
        $this->makeAvailability($resource);

        $startsAt = now()->addDay()->startOfDay()->addHours(10);

        $response = $this->postJson($this->url('/api/public/booking/hold'), [
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'starts_at'      => $startsAt->toIso8601String(),
            'customer_name'  => 'Hold Tester',
            'customer_email' => 'hold@example.com',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['hold_token', 'expires_at']]);

        $this->assertDatabaseHas('bookings', [
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
            'status'      => Booking::STATUS_PENDING_HOLD,
        ]);
    }

    #[Test]
    public function hold_returns_422_when_slot_is_unavailable(): void
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['duration_minutes' => 60]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);
        // No availability added → slot not available

        $startsAt = now()->addDay()->startOfDay()->addHours(10);

        $response = $this->postJson($this->url('/api/public/booking/hold'), [
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'starts_at'      => $startsAt->toIso8601String(),
            'customer_name'  => 'Hold Tester',
            'customer_email' => 'hold@example.com',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function confirm_hold_transitions_to_pending_and_sends_notification(): void
    {
        Notification::fake();

        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['duration_minutes' => 60]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);
        $this->makeAvailability($resource);

        $startsAt = now()->addDay()->startOfDay()->addHours(10);

        // Step 1: Create hold
        $holdResponse = $this->postJson($this->url('/api/public/booking/hold'), [
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'starts_at'      => $startsAt->toIso8601String(),
            'customer_name'  => 'Confirm Tester',
            'customer_email' => 'confirm@example.com',
        ]);
        $holdResponse->assertStatus(201);
        $holdToken = $holdResponse->json('data.hold_token');

        // Step 2: Confirm hold
        $confirmResponse = $this->postJson($this->url("/api/public/booking/hold/{$holdToken}"), []);

        $confirmResponse->assertStatus(200)
            ->assertJsonStructure(['data' => ['booking_id', 'starts_at', 'ends_at', 'status']]);

        // Status is either pending or confirmed depending on auto_confirm setting
        $booking = Booking::where('service_id', $service->id)
            ->where('resource_id', $resource->id)
            ->first();

        $this->assertNotNull($booking);
        $this->assertNotSame(Booking::STATUS_PENDING_HOLD, $booking->status);
        $this->assertContains($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED]);

        Notification::assertSentOnDemand(BookingReceivedNotification::class);
    }

    #[Test]
    public function confirm_hold_returns_410_when_hold_expired(): void
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        // Create an already-expired hold directly
        $service  = $this->makeService((string) $tenant->id, ['duration_minutes' => 60]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $token = Booking::generateToken();
        Booking::create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'customer_name'    => 'Expired Tester',
            'customer_email'   => 'expired@example.com',
            'starts_at'        => now()->addDay(),
            'ends_at'          => now()->addDay()->addHour(),
            'status'           => Booking::STATUS_PENDING_HOLD,
            'management_token' => $token,
            'hold_expires_at'  => now()->subMinute(), // already expired
        ]);

        $response = $this->postJson($this->url("/api/public/booking/hold/{$token}"), []);

        $response->assertStatus(410);
    }

    #[Test]
    public function confirm_hold_returns_404_for_unknown_token(): void
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $response = $this->postJson($this->url('/api/public/booking/hold/nonexistenttoken12345678'), []);

        $response->assertStatus(404);
    }

    #[Test]
    public function hold_rejects_missing_customer_fields(): void
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $response = $this->postJson($this->url('/api/public/booking/hold'), [
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
            'starts_at'   => now()->addDay()->toIso8601String(),
            // customer_name and customer_email missing
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['customer_name', 'customer_email']);
    }
}
