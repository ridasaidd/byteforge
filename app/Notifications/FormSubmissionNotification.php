<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class FormSubmissionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<mixed>  $values
     */
    public function __construct(
        public readonly string $tenantName,
        public readonly string $formName,
        public readonly array $values,
        public readonly string $submittedFrom,
    ) {
        $this->afterCommit();
        $this->onQueue('notifications');
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mailMessage = (new MailMessage)
            ->subject(sprintf('New %s form submission for %s', $this->formName, $this->tenantName))
            ->greeting('New form submission')
            ->line(sprintf('Tenant: %s', $this->tenantName))
            ->line(sprintf('Form: %s', $this->formName))
            ->line(sprintf('Submitted from: %s', $this->submittedFrom));

        foreach ($this->values as $field => $value) {
            $mailMessage->line(sprintf('%s: %s', $this->formatFieldLabel((string) $field), $this->formatValue($value)));
        }

        return $mailMessage;
    }

    private function formatFieldLabel(string $field): string
    {
        return Str::of($field)
            ->replace(['_', '-'], ' ')
            ->title()
            ->toString();
    }

    private function formatValue(mixed $value): string
    {
        if (is_array($value)) {
            $parts = [];

            foreach ($value as $nestedKey => $nestedValue) {
                if (is_string($nestedKey)) {
                    $parts[] = sprintf('%s: %s', $this->formatFieldLabel($nestedKey), $this->formatValue($nestedValue));
                    continue;
                }

                $parts[] = $this->formatValue($nestedValue);
            }

            return implode(', ', $parts);
        }

        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        if ($value === null || $value === '') {
            return 'None';
        }

        return (string) $value;
    }
}
