<?php

declare(strict_types=1);

namespace App\Notifications\Guest;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GuestMagicLinkNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Tenant $tenant,
        public readonly string $magicLink,
        public readonly int $ttlMinutes,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(sprintf('Your sign-in link for %s', $this->tenant->name))
            ->line(sprintf('Use this secure sign-in link to access your bookings for %s.', $this->tenant->name))
            ->line(sprintf('This link expires in %d minutes.', $this->ttlMinutes))
            ->action('Sign In', $this->magicLink)
            ->line('If you did not request this link, you can ignore this email.');
    }
}
