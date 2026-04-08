<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the customer when their booking is confirmed (status → confirmed).
 */
class BookingConfirmedNotification extends BaseBookingNotification
{
    protected function notificationType(): string
    {
        return 'booking.confirmed';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_CUSTOMER;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your booking is confirmed'))
            ->markdown('emails.booking.confirmed', [
                'booking'       => $this->booking,
                'managementUrl' => $this->managementUrl(),
            ]);
    }
}
