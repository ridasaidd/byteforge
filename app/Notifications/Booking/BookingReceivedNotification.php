<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the customer immediately after they create a booking that starts
 * as `pending` (requires manual confirmation). Tells them their request was
 * received and is awaiting confirmation.
 */
class BookingReceivedNotification extends BaseBookingNotification
{
    protected function notificationType(): string
    {
        return 'booking.received';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_CUSTOMER;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your booking request has been received'))
            ->markdown('emails.booking.received', [
                'booking'       => $this->booking,
                'managementUrl' => $this->managementUrl(),
            ]);
    }
}
