<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the customer when a booking is rescheduled (either by the customer
 * via the management link, or by the tenant via the CMS).
 */
class BookingRescheduledNotification extends BaseBookingNotification
{
    public function __construct(
        \App\Models\Booking $booking,
        string $tenantDomain,
        protected readonly string $rescheduledBy,  // 'customer' | 'tenant'
    ) {
        parent::__construct($booking, $tenantDomain);
    }

    protected function notificationType(): string
    {
        return "booking.rescheduled.by_{$this->rescheduledBy}";
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_CUSTOMER;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your booking has been rescheduled'))
            ->markdown('emails.booking.rescheduled', [
                'booking'       => $this->booking,
                'managementUrl' => $this->managementUrl(),
                'rescheduledBy' => $this->rescheduledBy,
            ]);
    }
}
