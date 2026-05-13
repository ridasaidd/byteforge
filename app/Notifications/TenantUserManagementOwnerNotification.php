<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TenantUserManagementOwnerNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const EVENT_ASSIGNED = 'assigned';
    public const EVENT_UPDATED = 'updated';
    public const EVENT_REMOVED = 'removed';

    public function __construct(
        public readonly Tenant $tenant,
        public readonly User $managedUser,
        public readonly User $actor,
        public readonly string $event,
        public readonly ?string $currentRole = null,
        public readonly ?string $previousRole = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject($this->subject())
            ->line(sprintf('Tenant: %s', $this->tenant->name))
            ->line(sprintf('Tenant domain: %s', $this->tenantDomain()))
            ->line(sprintf('Affected user: %s (%s)', $this->managedUser->name, $this->managedUser->email))
            ->line(sprintf('Changed by: %s (%s)', $this->actor->name, $this->actor->email));

        return match ($this->event) {
            self::EVENT_ASSIGNED => $message
                ->line(sprintf('Assigned role: %s', $this->currentRole ?? 'unknown'))
                ->line('A central operator added a tenant user membership.'),
            self::EVENT_UPDATED => $message
                ->line(sprintf('Previous role: %s', $this->previousRole ?? 'unknown'))
                ->line(sprintf('New role: %s', $this->currentRole ?? 'unknown'))
                ->line('A central operator changed a tenant user role.'),
            self::EVENT_REMOVED => $message
                ->line(sprintf('Previous role: %s', $this->previousRole ?? 'unknown'))
                ->line('A central operator removed tenant access for this user.'),
            default => $message,
        };
    }

    private function subject(): string
    {
        return match ($this->event) {
            self::EVENT_ASSIGNED => sprintf('Tenant user added for %s', $this->tenant->name),
            self::EVENT_UPDATED => sprintf('Tenant user role changed for %s', $this->tenant->name),
            self::EVENT_REMOVED => sprintf('Tenant user removed for %s', $this->tenant->name),
            default => sprintf('Tenant user updated for %s', $this->tenant->name),
        };
    }

    private function tenantDomain(): string
    {
        return $this->tenant->domains->first()?->domain
            ?? $this->tenant->domains()->first()?->domain
            ?? $this->tenant->slug;
    }
}
