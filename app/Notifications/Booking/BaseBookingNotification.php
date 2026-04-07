<?php

declare(strict_types=1);

namespace App\Notifications\Booking;

use App\Models\Booking;
use App\Models\BookingNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Base class for all transactional booking notifications.
 *
 * Subclasses implement:
 *  - notificationType() — BookingNotification type slug, e.g. 'booking.confirmed'
 *  - recipientType()    — BookingNotification::RECIPIENT_* constant
 *  - buildMailMessage() — return a configured MailMessage
 *
 * Idempotency: via() returns [] if a booking_notifications row for this
 * (booking_id, type, email) already exists — preventing duplicate sends.
 * On first send, toMail() records the row then returns the MailMessage.
 *
 * The tenant domain is passed at construction so it survives queue serialisation.
 */
abstract class BaseBookingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected readonly Booking $booking,
        protected readonly string $tenantDomain,
    ) {
        $this->onQueue('notifications');
    }

    /** Notification type slug stored in booking_notifications.type */
    abstract protected function notificationType(): string;

    /** One of BookingNotification::RECIPIENT_* */
    abstract protected function recipientType(): string;

    abstract protected function buildMailMessage(mixed $notifiable): MailMessage;

    /**
     * @return list<string>
     */
    final public function via(mixed $notifiable): array
    {
        $alreadySent = BookingNotification::where('booking_id', $this->booking->id)
            ->where('type', $this->notificationType())
            ->where('channel', BookingNotification::CHANNEL_EMAIL)
            ->exists();

        return $alreadySent ? [] : ['mail'];
    }

    final public function toMail(mixed $notifiable): MailMessage
    {
        BookingNotification::create([
            'booking_id' => $this->booking->id,
            'type'       => $this->notificationType(),
            'channel'    => BookingNotification::CHANNEL_EMAIL,
            'recipient'  => $this->recipientType(),
            'sent_at'    => now(),
        ]);

        return $this->buildMailMessage($notifiable);
    }

    /** URL for the customer's "manage my booking" page. */
    protected function managementUrl(): string
    {
        $token = $this->booking->management_token;
        return "https://{$this->tenantDomain}/booking/manage/{$token}";
    }
}
