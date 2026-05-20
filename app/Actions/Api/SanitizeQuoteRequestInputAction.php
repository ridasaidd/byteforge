<?php

declare(strict_types=1);

namespace App\Actions\Api;

class SanitizeQuoteRequestInputAction
{
    public function __construct(
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
    ) {}

    /**
     * Normalize customer-provided quote-request fields before validation/storage.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function __invoke(array $input): array
    {
        return ($this->normalizeInputFields)(
            $input,
            singleLineFields: ['guest_name', 'guest_email', 'guest_phone', 'subject_label'],
            multilineFields: ['request_description'],
        );
    }
}
