<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Tenant;
use App\Models\TenantSupportAccessGrant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TenantSupportAccessOwnerNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const EVENT_GRANTED = 'granted';
    public const EVENT_REVOKED = 'revoked';
    public const EVENT_EXPIRED = 'expired';

    public function __construct(
        public readonly Tenant $tenant,
        public readonly TenantSupportAccessGrant $grant,
        public readonly string $event,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $supportUser = $this->grant->supportUser;
        $supportIdentity = $supportUser?->name
            ? sprintf('%s (%s)', $supportUser->name, $supportUser->email)
            : ($supportUser?->email ?? ('user#' . $this->grant->support_user_id));

        $message = (new MailMessage)
            ->subject($this->subject())
            ->line(sprintf('Tenant: %s', $this->tenant->name))
            ->line(sprintf('Tenant domain: %s', $this->tenantDomain()))
            ->line(sprintf('Support user: %s', $supportIdentity))
            ->line(sprintf('Access window ends: %s', $this->formatDate($this->grant->expires_at?->toISOString())));

        if ($this->grant->reason) {
            $message->line(sprintf('Reason: %s', $this->grant->reason));
        }

        return match ($this->event) {
            self::EVENT_GRANTED => $message
                ->line(sprintf(
                    'Granted by: %s',
                    $this->grant->grantedBy?->email ?? ('user#' . $this->grant->granted_by_user_id)
                ))
                ->line('Temporary support access has been granted for this tenant.'),
            self::EVENT_REVOKED => $message
                ->line(sprintf(
                    'Revoked by: %s',
                    $this->grant->revokedBy?->email ?? ('user#' . $this->grant->revoked_by_user_id)
                ))
                ->line(sprintf('Revocation reason: %s', $this->grant->revoke_reason ?: 'No reason provided.'))
                ->line('Temporary support access has been revoked for this tenant.'),
            self::EVENT_EXPIRED => $message
                ->line(sprintf('Expired at: %s', $this->formatDate($this->grant->expires_at?->toISOString())))
                ->line('Temporary support access has expired automatically for this tenant.'),
            default => $message,
        };
    }

    private function subject(): string
    {
        return match ($this->event) {
            self::EVENT_GRANTED => sprintf('Temporary support access granted for %s', $this->tenant->name),
            self::EVENT_REVOKED => sprintf('Temporary support access revoked for %s', $this->tenant->name),
            self::EVENT_EXPIRED => sprintf('Temporary support access expired for %s', $this->tenant->name),
            default => sprintf('Temporary support access updated for %s', $this->tenant->name),
        };
    }

    private function tenantDomain(): string
    {
        return $this->tenant->domains->first()?->domain
            ?? $this->tenant->domains()->first()?->domain
            ?? "{$this->tenant->slug}.byteforge.se";
    }

    private function formatDate(?string $value): string
    {
        return $value ?? 'Unknown';
    }
}
