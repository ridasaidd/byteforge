<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\BookingNotification;
use App\Models\Resource;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent to the assigned staff member when a booking is confirmed and the
 * provisioned resource is a person-type resource with an associated user.
 *
 * The notifiable is the Resource (person) being assigned.
 */
class StaffBookingAssignedNotification extends BaseBookingNotification
{
    public function __construct(
        \App\Models\Booking $booking,
        string $tenantDomain,
        protected readonly Resource $resource,
    ) {
        parent::__construct($booking, $tenantDomain);
    }

    protected function notificationType(): string
    {
        return 'booking.confirmed.staff';
    }

    protected function recipientType(): string
    {
        return BookingNotification::RECIPIENT_STAFF;
    }

    protected function buildMailMessage(mixed $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('New booking assigned to you'))
            ->markdown('emails.booking.staff-assigned', [
                'booking'  => $this->booking,
                'resource' => $this->resource,
            ]);
    }
}
