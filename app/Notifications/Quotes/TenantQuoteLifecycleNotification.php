<?php

declare(strict_types=1);

namespace App\Notifications\Quotes;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TenantQuoteLifecycleNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const EVENT_ACCEPTED = 'accepted';
    public const EVENT_REJECTED = 'rejected';
    public const EVENT_CANCELLED = 'cancelled';
    public const EVENT_EXPIRED = 'expired';
    public const EVENT_CONVERTED = 'converted';

    public function __construct(
        private readonly Quote $quote,
        private readonly string $tenantDomain,
        public readonly string $event,
        private readonly ?int $bookingId = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $link = sprintf('https://%s/cms/quotes/%d', $this->tenantDomain, $this->quote->quote_request_id);

        $message = match ($this->event) {
            self::EVENT_ACCEPTED => ['Quote accepted', 'A guest accepted the quote.'],
            self::EVENT_REJECTED => ['Quote rejected', 'A guest rejected the quote.'],
            self::EVENT_CANCELLED => ['Quote cancelled', 'A tenant user cancelled a sent quote.'],
            self::EVENT_EXPIRED => ['Quote expired', 'A sent quote has expired and is no longer actionable.'],
            self::EVENT_CONVERTED => ['Quote converted', 'An accepted quote has been converted into a booking.'],
            default => ['Quote updated', 'A quote status changed.'],
        };

        $mail = (new MailMessage())
            ->subject($message[0])
            ->greeting($message[1])
            ->line(sprintf('Quote #%d for request #%d is now %s.', $this->quote->id, $this->quote->quote_request_id, $this->event));

        if ($this->bookingId !== null) {
            $mail->line(sprintf('Booking #%d was created from this quote.', $this->bookingId));
        }

        return $mail->action('Open quote', $link);
    }
}