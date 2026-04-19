<?php

declare(strict_types=1);

namespace App\Actions\Api;

use Illuminate\Support\Str;

class SanitizeBookingCustomerInputAction
{
    /**
     * Normalize customer-provided booking fields before validation/storage.
     *
     * This is not the primary XSS defense — output escaping still is.
     * The goal here is to reduce storage of noisy markup/control characters
     * and keep validation working on normalized values.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function __invoke(array $input): array
    {
        foreach (['customer_name', 'customer_email', 'customer_phone'] as $field) {
            if (array_key_exists($field, $input) && is_string($input[$field])) {
                $input[$field] = $this->sanitizeSingleLine($input[$field]);
            }
        }

        foreach (['customer_notes', 'internal_notes'] as $field) {
            if (array_key_exists($field, $input) && is_string($input[$field])) {
                $input[$field] = $this->sanitizeMultiline($input[$field]);
            }
        }

        return $input;
    }

    private function sanitizeSingleLine(string $value): string
    {
        $value = strip_tags($value);
        $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? $value;

        return Str::squish($value);
    }

    private function sanitizeMultiline(string $value): string
    {
        $value = strip_tags($value);
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $value) ?? $value;

        return trim($value);
    }
}
