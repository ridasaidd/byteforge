<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the customer when the tenant cancels their booking via the CMS.
 */
class BookingCancelledByTenantNotification extends BaseBookingNotification
{
    protected function notificationType(): string
    {
        return 'booking.cancelled.by_tenant';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_CUSTOMER;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your booking has been cancelled'))
            ->markdown('emails.booking.cancelled-by-tenant', [
                'booking' => $this->booking,
            ]);
    }
}
