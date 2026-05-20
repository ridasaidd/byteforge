<?php

declare(strict_types=1);

namespace App\Notifications\Quotes;

use App\Models\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TenantNewQuoteRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly QuoteRequest $quoteRequest,
        private readonly string $tenantDomain,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $link = sprintf('https://%s/cms/quotes/%d', $this->tenantDomain, $this->quoteRequest->id);

        return (new MailMessage())
            ->subject('New quote request received')
            ->greeting('A new quote request has arrived.')
            ->line("Guest: {$this->quoteRequest->guest_name} ({$this->quoteRequest->guest_email})")
            ->line('Open the request to prepare a quote and respond.')
            ->action('Review quote request', $link);
    }
}