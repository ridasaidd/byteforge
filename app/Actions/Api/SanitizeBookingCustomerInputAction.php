<?php

declare(strict_types=1);

namespace App\Actions\Api;

class SanitizeBookingCustomerInputAction
{
    public function __construct(
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
    ) {}

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
        return ($this->normalizeInputFields)(
            $input,
            singleLineFields: ['customer_name', 'customer_email', 'customer_phone'],
            multilineFields: ['customer_notes', 'internal_notes'],
        );
    }
}
