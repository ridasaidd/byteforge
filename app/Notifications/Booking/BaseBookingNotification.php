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
 * booking/type/channel combination already exists — preventing duplicate sends.
 * Successful mail delivery records the row via a NotificationSent listener,
 * so failed queued sends remain retryable.
 *
 * The tenant domain is passed at construction so it survives queue serialisation.
 */
abstract class BaseBookingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Booking $booking;

    protected string $tenantDomain;

    public function __construct(
        Booking $booking,
        string $tenantDomain,
    ) {
        $this->booking = $booking;
        $this->tenantDomain = $tenantDomain;
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
        $alreadySent = $this->sentNotificationQuery()->exists();

        return $alreadySent ? [] : ['mail'];
    }

    final public function toMail(mixed $notifiable): MailMessage
    {
        return $this->buildMailMessage($notifiable);
    }

    public function recordSentNotification(): void
    {
        BookingNotification::query()->firstOrCreate(
            $this->sentNotificationAttributes(),
            ['sent_at' => now()]
        );
    }

    /** URL for the customer's "manage my booking" page. */
    protected function managementUrl(): string
    {
        $token = $this->booking->management_token;
        return "https://{$this->tenantDomain}/booking/manage/{$token}";
    }

    private function sentNotificationQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return BookingNotification::query()->where($this->sentNotificationAttributes());
    }

    /**
     * @return array{booking_id: int, type: string, channel: string, recipient: string}
     */
    private function sentNotificationAttributes(): array
    {
        return [
            'booking_id' => $this->booking->id,
            'type' => $this->notificationType(),
            'channel' => BookingNotification::CHANNEL_EMAIL,
            'recipient' => $this->recipientType(),
        ];
    }
}
