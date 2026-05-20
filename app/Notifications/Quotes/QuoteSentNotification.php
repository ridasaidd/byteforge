<?php

declare(strict_types=1);

namespace App\Notifications\Quotes;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class QuoteSentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Quote $quote,
        private readonly string $tenantDomain,
        private readonly string $publicToken,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function reviewUrl(): string
    {
        return sprintf('https://%s/quotes/%s', $this->tenantDomain, $this->publicToken);
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Your quote is ready')
            ->greeting('Your quote is ready for review.')
            ->line('Use the secure link below to review and accept or reject the quote.')
            ->action('Review quote', $this->reviewUrl());
    }
}
