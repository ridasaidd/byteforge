<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\Booking;
use App\Models\BookingNotification;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Settings\TenantSettings;
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
    private const REMINDER_LOOKBACK_MINUTES = 15;

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
                $fallbackTemplate = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.localhost');
                $settings = app(TenantSettings::class);

                $domain = $tenant->domains()->first()?->domain
                    ?? str_replace(':tenant', $tenant->slug, $fallbackTemplate);

                foreach ($this->reminderHours($settings) as $reminderHours) {
                    [$lowerBound, $upperBound] = $this->windowBounds($reminderHours);

                    $this->sendRemindersForWindow($domain, $reminderHours, $upperBound, $lowerBound);
                }
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
        int $windowHours,
        Carbon $upperBound,
        Carbon $lowerBound,
    ): void {
        $window = "{$windowHours}h";
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

    /**
     * @return list<int>
     */
    private function reminderHours(TenantSettings $settings): array
    {
        $hours = collect($settings->booking_reminder_hours ?? [])
            ->map(static fn (mixed $value): int => (int) $value)
            ->filter(static fn (int $value): bool => $value >= 0)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();

        return $hours !== [] ? $hours : [24, 1];
    }

    /**
        * @return array{0: Carbon, 1: Carbon}
     */
    private function windowBounds(int $reminderHours): array
    {
        if ($reminderHours === 0) {
            $lowerBound = now();
            $upperBound = now()->addMinutes(self::REMINDER_LOOKBACK_MINUTES);

            return [$lowerBound, $upperBound];
        }

        $upperBound = now()->addHours($reminderHours);
        $lowerBound = $upperBound->copy()->subMinutes(self::REMINDER_LOOKBACK_MINUTES);

        return [$lowerBound, $upperBound];
    }
}
