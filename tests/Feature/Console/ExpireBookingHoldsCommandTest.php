<?php

namespace Tests\Feature\Console;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\TenantAddon;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class ExpireBookingHoldsCommandTest extends TestCase
{
    #[Test]
    public function command_deletes_only_expired_pending_hold_bookings(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $this->activateBookingAddon($tenant);

        tenancy()->initialize($tenant);

        $service = BookingService::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'booking_mode' => BookingService::MODE_SLOT,
        ]);

        $resource = BookingResource::factory()->create([
            'tenant_id' => (string) $tenant->id,
        ]);

        $expiredHold = Booking::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_PENDING_HOLD,
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
            'hold_expires_at' => now()->subMinute(),
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addMonth(),
        ]);

        $activeHold = Booking::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_PENDING_HOLD,
            'starts_at' => now()->addDay()->addHours(2),
            'ends_at' => now()->addDay()->addHours(3),
            'hold_expires_at' => now()->addMinutes(10),
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addMonth(),
        ]);

        $confirmedBooking = Booking::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->addHours(4),
            'ends_at' => now()->addDay()->addHours(5),
            'hold_expires_at' => now()->subMinute(),
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addMonth(),
        ]);

        tenancy()->end();

        $this->artisan('bookings:expire-holds')
            ->assertExitCode(0);

        $this->assertSoftDeleted('bookings', [
            'id' => $expiredHold->id,
        ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $activeHold->id,
            'status' => Booking::STATUS_PENDING_HOLD,
        ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $confirmedBooking->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);
    }

    private function activateBookingAddon(\App\Models\Tenant $tenant): void
    {
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'booking'],
            [
                'name' => 'Booking',
                'description' => 'Booking system',
                'stripe_price_id' => 'price_booking_placeholder',
                'price_monthly' => 4900,
                'currency' => 'SEK',
                'feature_flag' => 'booking',
                'is_active' => true,
                'sort_order' => 10,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null]
        );
    }
}
