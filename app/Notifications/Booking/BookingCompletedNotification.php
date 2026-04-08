<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the customer when a booking is marked as completed.
 * Delivery is optional per-service configuration (see spec §13.5).
 */
class BookingCompletedNotification extends BaseBookingNotification
{
    protected function notificationType(): string
    {
        return 'booking.completed';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_CUSTOMER;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Thank you for your booking'))
            ->markdown('emails.booking.completed', [
                'booking' => $this->booking,
            ]);
    }
}
