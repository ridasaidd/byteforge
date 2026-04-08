<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Scheduled reminder sent to the customer before their booking.
 *
 * The same class handles both the 24-hour and 1-hour reminders; the
 * notification type slug encodes which window was used, so idempotency
 * correctly prevents dual delivery at the same window.
 *
 * Valid windows: '24h' | '1h'
 */
class BookingReminderNotification extends BaseBookingNotification
{
    public function __construct(
        \App\Models\Booking $booking,
        string $tenantDomain,
        protected readonly string $window,  // '24h' | '1h'
    ) {
        parent::__construct($booking, $tenantDomain);
    }

    protected function notificationType(): string
    {
        return "booking.reminder_{$this->window}";
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_CUSTOMER;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Reminder: your upcoming booking'))
            ->markdown('emails.booking.reminder', [
                'booking'       => $this->booking,
                'window'        => $this->window,
                'managementUrl' => $this->managementUrl(),
            ]);
    }
}
