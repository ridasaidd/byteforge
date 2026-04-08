<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the tenant owner when a new booking arrives (pending or auto-confirmed).
 * Keeps the owner informed without requiring them to poll the CMS dashboard.
 */
class TenantNewBookingNotification extends BaseBookingNotification
{
    protected function notificationType(): string
    {
        return 'booking.owner.received';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_ADMIN;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('New booking received'))
            ->markdown('emails.booking.owner-received', [
                'booking' => $this->booking,
            ]);
    }
}
