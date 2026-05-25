<?php

declare(strict_types=1);

namespace App\Actions\Api;

class SanitizeQuoteDraftInputAction
{
    public function __construct(
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
    ) {}

    /**
     * Normalize tenant-authored quote draft human-text fields before validation/storage.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function __invoke(array $input): array
    {
        $input = ($this->normalizeInputFields)(
            $input,
            multilineFields: ['customer_message', 'internal_notes'],
        );

        if (! isset($input['line_items']) || ! is_array($input['line_items'])) {
            return $input;
        }

        $input['line_items'] = array_map(function (mixed $item): mixed {
            if (! is_array($item)) {
                return $item;
            }

            return ($this->normalizeInputFields)(
                $item,
                singleLineFields: ['label'],
                multilineFields: ['description'],
            );
        }, $input['line_items']);

        return $input;
    }
}
