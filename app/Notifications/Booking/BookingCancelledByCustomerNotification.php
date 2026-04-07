<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the tenant admin when a customer cancels their own booking via the
 * management link. Gives the admin visibility into lost capacity.
 */
class BookingCancelledByCustomerNotification extends BaseBookingNotification
{
    protected function notificationType(): string
    {
        return 'booking.cancelled.by_customer';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_ADMIN;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('A customer has cancelled their booking'))
            ->markdown('emails.booking.cancelled-by-customer', [
                'booking' => $this->booking,
            ]);
    }
}
