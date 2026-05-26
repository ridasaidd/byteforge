<?php

namespace Tests\Feature\Console;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\TenantAddon;
use App\Notifications\Booking\BookingReminderNotification;
use App\Settings\TenantSettings;
use Illuminate\Support\Str;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class SendBookingRemindersCommandTest extends TestCase
{
    #[Test]
    public function command_uses_tenant_configured_reminder_hours(): void
    {
        Notification::fake();

        $tenant = TestUsers::tenant('tenant-one');
        $this->activateBookingAddon($tenant);

        tenancy()->initialize($tenant);

        $settings = app(TenantSettings::class);
        $settings->booking_reminder_hours = [2];
        $settings->save();

        $service = BookingService::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'booking_mode' => BookingService::MODE_SLOT,
        ]);

        $resource = BookingResource::factory()->create([
            'tenant_id' => (string) $tenant->id,
        ]);

        $targetBooking = Booking::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addHours(2)->subMinutes(5),
            'ends_at' => now()->addHours(3)->subMinutes(5),
            'customer_name' => 'Reminder Target',
            'customer_email' => 'target@example.com',
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addMonth(),
        ]);

        $controlBooking = Booking::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addHours(24)->subMinutes(5),
            'ends_at' => now()->addHours(25)->subMinutes(5),
            'customer_name' => 'Reminder Control',
            'customer_email' => 'control@example.com',
            'management_token' => Booking::generateToken(),
            'token_expires_at' => now()->addMonth(),
        ]);

        tenancy()->end();

        $this->artisan('bookings:send-reminders')
            ->assertExitCode(0);

        Notification::assertSentOnDemandTimes(BookingReminderNotification::class, 1);
        Notification::assertSentOnDemand(
            BookingReminderNotification::class,
            function (BookingReminderNotification $notification, array $channels, AnonymousNotifiable $notifiable) use ($targetBooking, $controlBooking): bool {
                $booking = $this->readProperty($notification, 'booking');
                $window = $this->readProperty($notification, 'window');
                $mailRoute = $notifiable->routes['mail'] ?? null;

                return $channels === ['mail']
                    && $booking instanceof Booking
                    && $booking->is($targetBooking)
                    && ! $booking->is($controlBooking)
                    && $window === '2h'
                    && $mailRoute === ['target@example.com' => 'Reminder Target'];
            }
        );
    }

    #[Test]
    public function reminder_email_copy_uses_the_configured_hour_window(): void
    {
        $tenant = TestUsers::tenant('tenant-one');
        $this->activateBookingAddon($tenant);

        tenancy()->initialize($tenant);

        try {
            $service = BookingService::factory()->create([
                'tenant_id' => (string) $tenant->id,
                'name' => 'Reminder Copy Service',
            ]);

            $resource = BookingResource::factory()->create([
                'tenant_id' => (string) $tenant->id,
            ]);

            $booking = Booking::factory()->create([
                'tenant_id' => (string) $tenant->id,
                'service_id' => $service->id,
                'resource_id' => $resource->id,
                'status' => Booking::STATUS_CONFIRMED,
                'starts_at' => now()->addHours(2)->subMinutes(5),
                'ends_at' => now()->addHours(3)->subMinutes(5),
                'customer_name' => 'Reminder Copy Target',
                'customer_email' => 'copy-target@example.com',
                'management_token' => Booking::generateToken(),
                'token_expires_at' => now()->addMonth(),
            ]);

            $notification = new BookingReminderNotification($booking, 'tenant-one.dev.byteforge.se', '2h');
            $mailMessage = $notification->toMail(new AnonymousNotifiable());

            $rendered = (string) $mailMessage->render();
        } finally {
            tenancy()->end();
        }

        $this->assertTrue(Str::contains($rendered, 'in about 2 hours'));
        $this->assertFalse(Str::contains($rendered, 'in about 1 hour'));
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

    private function readProperty(object $object, string $property): mixed
    {
        $reflection = new \ReflectionProperty($object, $property);
        $reflection->setAccessible(true);

        return $reflection->getValue($object);
    }
}
