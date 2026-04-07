<?php

namespace Tests\Feature\Api\Booking;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Tenant;
use App\Models\TenantAddon;
use Laravel\Pennant\Feature;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PublicBookingApiTest extends TestCase
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

    private function deactivateBookingAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->where('slug', 'booking')->first();
        if ($addon) {
            TenantAddon::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('addon_id', $addon->id)
                ->update(['deactivated_at' => now()->subSecond()]);
        }

        // Raw query-builder updates bypass Eloquent observers, so Pennant's
        // in-memory cache is never automatically busted. Forget it explicitly.
        Feature::for($tenant)->forget('booking');
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

    // ─── Addon gating ────────────────────────────────────────────────────────

    #[Test]
    public function public_services_blocked_without_booking_addon(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->deactivateBookingAddon($tenant);

        $this->getJson($this->url('/api/public/booking/services'))
            ->assertForbidden();
    }

    // ─── GET /api/public/booking/services ────────────────────────────────────

    #[Test]
    public function can_list_active_services(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $active   = $this->makeService((string) $tenant->id, ['is_active' => true]);
        $inactive = $this->makeService((string) $tenant->id, ['is_active' => false]);

        $resp = $this->getJson($this->url('/api/public/booking/services'));

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($active->id));
        $this->assertFalse($ids->contains($inactive->id));
    }

    #[Test]
    public function services_are_tenant_isolated(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateBookingAddon($tenantOne);
        $this->activateBookingAddon($tenantTwo);

        $serviceOne = $this->makeService((string) $tenantOne->id);
        $serviceTwo = $this->makeService((string) $tenantTwo->id);

        $resp = $this->getJson($this->url('/api/public/booking/services', 'tenant-one'));

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($serviceOne->id));
        $this->assertFalse($ids->contains($serviceTwo->id));
    }

    // ─── GET /api/public/booking/resources ───────────────────────────────────

    #[Test]
    public function can_list_resources_for_service(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $resp = $this->getJson($this->url("/api/public/booking/resources?service_id={$service->id}"));

        $resp->assertOk();
        $ids = collect($resp->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($resource->id));
    }

    #[Test]
    public function resources_endpoint_requires_service_id(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $this->getJson($this->url('/api/public/booking/resources'))
            ->assertUnprocessable();
    }

    // ─── GET /api/public/booking/slots ───────────────────────────────────────

    #[Test]
    public function can_get_slots_for_slot_mode_service(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, [
            'booking_mode'          => BookingService::MODE_SLOT,
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
        ]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        // Add a specific-date availability window for tomorrow
        $date = now()->addDay()->format('Y-m-d');
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'day_of_week'   => null,
            'specific_date' => $date,
            'starts_at'     => '09:00:00',
            'ends_at'       => '17:00:00',
            'is_blocked'    => false,
        ]);

        $resp = $this->getJson($this->url(
            "/api/public/booking/slots?service_id={$service->id}&resource_id={$resource->id}&date={$date}"
        ));

        $resp->assertOk();
        $this->assertIsArray($resp->json('data'));
        $this->assertNotEmpty($resp->json('data'));

        $first = $resp->json('data.0');
        $this->assertArrayHasKey('starts_at', $first);
        $this->assertArrayHasKey('ends_at', $first);
        $this->assertArrayHasKey('available', $first);
    }

    #[Test]
    public function slots_endpoint_requires_date_for_slot_mode(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['booking_mode' => BookingService::MODE_SLOT]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $this->getJson($this->url(
            "/api/public/booking/slots?service_id={$service->id}&resource_id={$resource->id}"
        ))->assertUnprocessable();
    }

    // ─── GET /api/public/booking/availability ────────────────────────────────

    #[Test]
    public function can_check_range_availability(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['booking_mode' => BookingService::MODE_RANGE]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        // All days available (day_of_week 0-6)
        for ($day = 0; $day <= 6; $day++) {
            BookingAvailability::create([
                'resource_id'   => $resource->id,
                'day_of_week'   => $day,
                'specific_date' => null,
                'starts_at'     => '00:00:00',
                'ends_at'       => '23:59:00',
                'is_blocked'    => false,
            ]);
        }

        $checkIn  = now()->addDays(5)->format('Y-m-d');
        $checkOut = now()->addDays(7)->format('Y-m-d');

        $resp = $this->getJson($this->url(
            "/api/public/booking/availability?service_id={$service->id}&resource_id={$resource->id}&check_in={$checkIn}&check_out={$checkOut}"
        ));

        $resp->assertOk();
        $this->assertArrayHasKey('available', $resp->json());
    }

    // ─── POST /api/public/booking ─────────────────────────────────────────────

    #[Test]
    public function can_create_slot_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, [
            'booking_mode'     => BookingService::MODE_SLOT,
            'duration_minutes' => 60,
        ]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $date = now()->addDays(3)->format('Y-m-d');
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'specific_date' => $date,
            'starts_at'     => '08:00:00',
            'ends_at'       => '18:00:00',
            'is_blocked'    => false,
        ]);

        $startsAt = now()->addDays(3)->setTimeFromTimeString('10:00:00')->toIso8601String();
        $endsAt   = now()->addDays(3)->setTimeFromTimeString('11:00:00')->toIso8601String();

        $resp = $this->postJson($this->url('/api/public/booking'), [
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'starts_at'      => $startsAt,
            'ends_at'        => $endsAt,
            'customer_name'  => 'Test Customer',
            'customer_email' => 'test@example.com',
        ]);

        $resp->assertCreated();
        $this->assertArrayHasKey('booking_id', $resp->json('data'));
        $this->assertArrayHasKey('status', $resp->json('data'));
    }

    #[Test]
    public function management_token_never_returned_in_create_response(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['booking_mode' => BookingService::MODE_SLOT, 'duration_minutes' => 60]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $date = now()->addDays(2)->format('Y-m-d');
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'specific_date' => $date,
            'starts_at'     => '08:00:00',
            'ends_at'       => '18:00:00',
        ]);

        $startsAt = now()->addDays(2)->setTimeFromTimeString('09:00:00')->toIso8601String();
        $endsAt   = now()->addDays(2)->setTimeFromTimeString('10:00:00')->toIso8601String();

        $resp = $this->postJson($this->url('/api/public/booking'), [
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'starts_at'      => $startsAt,
            'ends_at'        => $endsAt,
            'customer_name'  => 'Test Customer',
            'customer_email' => 'test@example.com',
        ]);

        $resp->assertCreated();
        $this->assertArrayNotHasKey('management_token', $resp->json('data'));
        $this->assertStringNotContainsString('management_token', json_encode($resp->json()));
    }

    #[Test]
    public function create_booking_validates_required_fields(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $this->postJson($this->url('/api/public/booking'), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['service_id', 'resource_id', 'customer_name', 'customer_email']);
    }

    // ─── GET /api/public/booking/{token} ─────────────────────────────────────

    #[Test]
    public function can_view_booking_by_management_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $token   = Booking::generateToken();
        $booking = Booking::factory()->create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'management_token' => $token,
            'token_expires_at' => now()->addDays(30),
            'status'           => Booking::STATUS_CONFIRMED,
        ]);

        $resp = $this->getJson($this->url("/api/public/booking/{$token}"));

        $resp->assertOk();
        $this->assertEquals($booking->id, $resp->json('data.id'));
        $this->assertArrayNotHasKey('management_token', $resp->json('data'));
    }

    #[Test]
    public function invalid_token_returns_404(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $this->getJson($this->url('/api/public/booking/totally-invalid-token'))
            ->assertNotFound();
    }

    #[Test]
    public function expired_token_returns_410(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $token = Booking::generateToken();
        Booking::factory()->create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'management_token' => $token,
            'token_expires_at' => now()->subDay(), // expired
        ]);

        $this->getJson($this->url("/api/public/booking/{$token}"))
            ->assertStatus(410);
    }

    // ─── PATCH /api/public/booking/{token}/cancel ────────────────────────────

    #[Test]
    public function can_cancel_booking_by_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $token   = Booking::generateToken();
        $booking = Booking::factory()->create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'management_token' => $token,
            'token_expires_at' => now()->addDays(30),
            'status'           => Booking::STATUS_CONFIRMED,
        ]);

        $resp = $this->patchJson($this->url("/api/public/booking/{$token}/cancel"));

        $resp->assertOk();
        $this->assertEquals(Booking::STATUS_CANCELLED, $resp->json('data.status'));
        $this->assertDatabaseHas('bookings', [
            'id'           => $booking->id,
            'status'       => Booking::STATUS_CANCELLED,
            'cancelled_by' => Booking::CANCELLED_BY_CUSTOMER,
        ]);
    }

    #[Test]
    public function cannot_cancel_already_cancelled_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $token = Booking::generateToken();
        Booking::factory()->cancelled()->create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'management_token' => $token,
            'token_expires_at' => now()->addDays(30),
        ]);

        $this->patchJson($this->url("/api/public/booking/{$token}/cancel"))
            ->assertUnprocessable();
    }

    #[Test]
    public function token_from_different_tenant_returns_404(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateBookingAddon($tenantOne);
        $this->activateBookingAddon($tenantTwo);

        $service  = $this->makeService((string) $tenantTwo->id);
        $resource = $this->makeResource((string) $tenantTwo->id);

        // Token belongs to tenant-two
        $token = Booking::generateToken();
        Booking::factory()->create([
            'tenant_id'        => (string) $tenantTwo->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'management_token' => $token,
            'token_expires_at' => now()->addDays(30),
        ]);

        // Request goes to tenant-one — should not find the token
        $this->getJson($this->url("/api/public/booking/{$token}", 'tenant-one'))
            ->assertNotFound();
    }

    // ─── GET /api/public/booking/next-available ───────────────────────────────

    #[Test]
    public function next_available_returns_date_and_first_slot_when_window_exists(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, [
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => 30,
        ]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        // Open every day of the week so there is definitely a slot today or tomorrow
        for ($dow = 0; $dow <= 6; $dow++) {
            BookingAvailability::create([
                'resource_id'   => $resource->id,
                'day_of_week'   => $dow,
                'specific_date' => null,
                'starts_at'     => '09:00:00',
                'ends_at'       => '17:00:00',
                'is_blocked'    => false,
            ]);
        }

        $this->getJson($this->url("/api/public/booking/next-available?service_id={$service->id}"))
            ->assertOk()
            ->assertJsonPath('data.date', fn ($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) === 1)
            ->assertJsonPath('data.first_slot', fn ($v) => preg_match('/^\d{2}:\d{2}$/', $v) === 1)
            ->assertJsonPath('data.resource_id', $resource->id);
    }

    #[Test]
    public function next_available_returns_null_when_no_windows_configured(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, ['max_advance_days' => 7]);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        // No availability windows → no slots ever
        $this->getJson($this->url("/api/public/booking/next-available?service_id={$service->id}"))
            ->assertOk()
            ->assertJsonPath('data', null);
    }
}
