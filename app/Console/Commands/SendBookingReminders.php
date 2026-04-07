<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\BookingNotification;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Notifications\Booking\BookingReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Sends 24-hour and 1-hour reminder emails for upcoming confirmed bookings.
 *
 * Runs every 15 minutes. Command-level idempotency: skips any booking already
 * recorded in booking_notifications for the given type slug.
 *
 * Only processes tenants with an active 'booking' addon.
 */
class SendBookingReminders extends Command
{
    protected $signature = 'bookings:send-reminders';

    protected $description = 'Send 24h and 1h reminder emails for upcoming confirmed bookings';

    public function handle(): int
    {
        $tenantIds = TenantAddon::active()
            ->whereHas('addon', fn ($q) => $q->where('feature_flag', 'booking'))
            ->pluck('tenant_id');

        if ($tenantIds->isEmpty()) {
            return self::SUCCESS;
        }

        foreach ($tenantIds as $tenantId) {
            $tenant = Tenant::find($tenantId);
            if (! $tenant) {
                continue;
            }

            tenancy()->initialize($tenant);

            try {
                $domain = $tenant->domains()->first()?->domain
                    ?? "{$tenant->slug}.byteforge.se";

                $this->sendRemindersForWindow($domain, '24h', now()->addHours(24), now()->addHours(23));
                $this->sendRemindersForWindow($domain, '1h', now()->addHour(), now()->addMinutes(45));
            } finally {
                tenancy()->end();
            }
        }

        return self::SUCCESS;
    }

    /**
     * Send reminders for bookings starting within the given window,
     * skipping any that already have a reminder notification recorded.
     */
    private function sendRemindersForWindow(
        string $domain,
        string $window,
        \Carbon\Carbon $upperBound,
        \Carbon\Carbon $lowerBound,
    ): void {
        $typeSlug = "booking.reminder_{$window}";

        $bookings = Booking::query()
            ->confirmed()
            ->whereBetween('starts_at', [$lowerBound, $upperBound])
            ->whereDoesntHave('notifications', function ($q) use ($typeSlug) {
                $q->where('type', $typeSlug)
                  ->where('channel', BookingNotification::CHANNEL_EMAIL);
            })
            ->with('service')
            ->get();

        foreach ($bookings as $booking) {
            Notification::route('mail', [
                $booking->customer_email => $booking->customer_name,
            ])->notify(new BookingReminderNotification($booking, $domain, $window));
        }
    }
}
