<?php

declare(strict_types=1);

namespace App\Actions\Api;

use Illuminate\Support\Str;

class NormalizeInputFieldsAction
{
    /**
     * Normalize only explicitly named human-input fields.
     *
     * This action is intentionally field-list driven. Do not apply it blindly
     * to passwords, tokens, signatures, provider payloads, or structured data.
     *
     * @param  array<string, mixed>  $input
     * @param  list<string>  $singleLineFields
     * @param  list<string>  $multilineFields
     * @return array<string, mixed>
     */
    public function __invoke(array $input, array $singleLineFields = [], array $multilineFields = []): array
    {
        foreach ($singleLineFields as $field) {
            if (array_key_exists($field, $input) && is_string($input[$field])) {
                $input[$field] = $this->normalizeSingleLine($input[$field]);
            }
        }

        foreach ($multilineFields as $field) {
            if (array_key_exists($field, $input) && is_string($input[$field])) {
                $input[$field] = $this->normalizeMultiline($input[$field]);
            }
        }

        return $input;
    }

    private function normalizeSingleLine(string $value): string
    {
        $value = strip_tags($value);
        $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? $value;

        return Str::squish($value);
    }

    private function normalizeMultiline(string $value): string
    {
        $value = strip_tags($value);
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $value) ?? $value;

        return trim($value);
    }
}
