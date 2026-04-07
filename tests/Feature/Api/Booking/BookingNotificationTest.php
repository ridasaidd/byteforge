<?php

namespace Tests\Feature\Api\Booking;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\BookingNotification;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Notifications\Booking\BookingCancelledByCustomerNotification;
use App\Notifications\Booking\BookingCancelledByTenantNotification;
use App\Notifications\Booking\BookingConfirmedNotification;
use App\Notifications\Booking\BookingReceivedNotification;
use App\Notifications\Booking\BookingRescheduledNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingNotificationTest extends TestCase
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

    // ─── public booking received ──────────────────────────────────────────────

    #[Test]
    public function booking_received_notification_dispatched_on_create(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $this->makeAvailability($resource);

        $startsAt = now()->addDay()->setTime(10, 0)->format('Y-m-d H:i:s');
        $endsAt   = now()->addDay()->setTime(11, 0)->format('Y-m-d H:i:s');

        $this->postJson($this->url('/api/public/booking'), [
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'starts_at'      => $startsAt,
            'ends_at'        => $endsAt,
            'customer_name'  => 'Alice Test',
            'customer_email' => 'alice@example.com',
        ])->assertCreated();

        Notification::assertSentOnDemand(BookingReceivedNotification::class);
    }

    // ─── public booking cancelled by customer ─────────────────────────────────

    #[Test]
    public function booking_cancelled_by_customer_notification_dispatched_on_cancel(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $token   = Booking::generateToken();
        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        Booking::factory()->create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'status'           => Booking::STATUS_CONFIRMED,
            'management_token' => $token,
            'token_expires_at' => now()->addMonth(),
            'starts_at'        => now()->addDay(),
            'ends_at'          => now()->addDay()->addHour(),
            'customer_email'   => 'alice@example.com',
            'customer_name'    => 'Alice Test',
        ]);

        $this->patchJson($this->url("/api/public/booking/{$token}/cancel"))
            ->assertOk();

        Notification::assertSentOnDemand(BookingCancelledByCustomerNotification::class);
    }

    // ─── CMS confirm ─────────────────────────────────────────────────────────

    #[Test]
    public function booking_confirmed_notification_dispatched_when_tenant_confirms(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $booking = Booking::factory()->create([
            'tenant_id'      => (string) $tenant->id,
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'status'         => Booking::STATUS_PENDING,
            'starts_at'      => now()->addDay(),
            'ends_at'        => now()->addDay()->addHour(),
            'customer_email' => 'alice@example.com',
            'customer_name'  => 'Alice Test',
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/confirm"))
            ->assertOk();

        Notification::assertSentOnDemand(BookingConfirmedNotification::class);
    }

    // ─── CMS cancel ──────────────────────────────────────────────────────────

    #[Test]
    public function booking_cancelled_by_tenant_notification_dispatched_when_tenant_cancels(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $booking = Booking::factory()->create([
            'tenant_id'      => (string) $tenant->id,
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'status'         => Booking::STATUS_CONFIRMED,
            'starts_at'      => now()->addDay(),
            'ends_at'        => now()->addDay()->addHour(),
            'customer_email' => 'alice@example.com',
            'customer_name'  => 'Alice Test',
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/cancel"))
            ->assertOk();

        Notification::assertSentOnDemand(BookingCancelledByTenantNotification::class);
    }

    // ─── CMS reschedule ───────────────────────────────────────────────────────

    #[Test]
    public function booking_rescheduled_notification_dispatched_when_tenant_reschedules(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id, [
            'booking_mode' => BookingService::MODE_RANGE,
        ]);
        $resource = $this->makeResource((string) $tenant->id);

        $booking = Booking::factory()->create([
            'tenant_id'      => (string) $tenant->id,
            'service_id'     => $service->id,
            'resource_id'    => $resource->id,
            'status'         => Booking::STATUS_CONFIRMED,
            'starts_at'      => now()->addDay(),
            'ends_at'        => now()->addDay()->addHour(),
            'customer_email' => 'alice@example.com',
            'customer_name'  => 'Alice Test',
        ]);

        $newStart = now()->addDays(2)->setTime(14, 0)->format('Y-m-d H:i:s');
        $newEnd   = now()->addDays(2)->setTime(15, 0)->format('Y-m-d H:i:s');

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/reschedule"), [
                'starts_at' => $newStart,
                'ends_at'   => $newEnd,
            ])
            ->assertOk();

        Notification::assertSentOnDemand(BookingRescheduledNotification::class);
    }

    // ─── Idempotency ─────────────────────────────────────────────────────────

    #[Test]
    public function notification_not_resent_if_booking_notification_row_exists(): void
    {
        Notification::fake();

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        $booking = Booking::factory()->create([
            'tenant_id'        => (string) $tenant->id,
            'service_id'       => $service->id,
            'resource_id'      => $resource->id,
            'status'           => Booking::STATUS_PENDING,
            'starts_at'        => now()->addDay(),
            'ends_at'          => now()->addDay()->addHour(),
            'customer_email'   => 'alice@example.com',
            'customer_name'    => 'Alice Test',
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addMonth(),
        ]);

        // Pre-seed idempotency row
        BookingNotification::create([
            'booking_id' => $booking->id,
            'type'       => 'booking.received',
            'channel'    => BookingNotification::CHANNEL_EMAIL,
            'recipient'  => BookingNotification::RECIPIENT_CUSTOMER,
            'sent_at'    => now(),
        ]);

        $domain = 'tenant-one.byteforge.se';

        $notification = new BookingReceivedNotification($booking, $domain);
        $channels = $notification->via(new \Illuminate\Notifications\AnonymousNotifiable);

        $this->assertEmpty($channels, 'via() should return [] when notification already sent');
    }
}
