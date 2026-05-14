<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Notifications\FormSubmissionNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class FormSubmissionController extends Controller
{
    public function __construct(
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
    ) {}

    public function email(Request $request): JsonResponse
    {
        $input = $request->all();
        $normalizedInput = ($this->normalizeInputFields)(
            $input,
            singleLineFields: ['to', 'formName'],
        );

        if (array_key_exists('website', $input)) {
            $normalizedInput['website'] = $input['website'];
        }

        $validated = Validator::make($normalizedInput, [
            'to' => ['required', 'email:rfc', 'max:255'],
            'formName' => ['required', 'string', 'max:120'],
            'website' => ['present', 'nullable', 'string', 'max:0'],
            'values' => ['required', 'array', 'min:1', 'max:50'],
        ])->validate();

        $normalizedValues = $this->normalizeSubmittedValues($validated['values']);
        $encodedValues = json_encode($normalizedValues);

        if ($encodedValues === false || strlen($encodedValues) > 20000) {
            throw ValidationException::withMessages([
                'values' => ['The values field must not exceed 20000 characters when serialized.'],
            ]);
        }

        $tenant = $this->currentTenant();

        Notification::route('mail', [$validated['to'] => $validated['to']])
            ->notify(new FormSubmissionNotification(
                tenantName: $tenant->name,
                formName: $validated['formName'],
                values: $normalizedValues,
                submittedFrom: $request->getSchemeAndHttpHost(),
            ));

        return response()->json([
            'sent' => true,
        ]);
    }

    /**
     * @param  array<mixed>  $values
     * @return array<mixed>
     */
    private function normalizeSubmittedValues(array $values): array
    {
        $normalized = [];
        $stringValues = [];
        $singleLineFields = [];
        $multilineFields = [];

        foreach ($values as $key => $value) {
            $normalizedKey = is_string($key) ? $key : (string) $key;

            if (is_array($value)) {
                $normalized[$normalizedKey] = $this->normalizeSubmittedValues($value);
                continue;
            }

            if (is_string($value)) {
                $stringValues[$normalizedKey] = $value;

                if (str_contains($value, "\n") || str_contains($value, "\r")) {
                    $multilineFields[] = $normalizedKey;
                } else {
                    $singleLineFields[] = $normalizedKey;
                }

                continue;
            }

            if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
                $normalized[$normalizedKey] = $value;
                continue;
            }

            $normalized[$normalizedKey] = (string) $value;
        }

        $normalizedStrings = ($this->normalizeInputFields)(
            $stringValues,
            singleLineFields: $singleLineFields,
            multilineFields: $multilineFields,
        );

        foreach ($values as $key => $value) {
            $normalizedKey = is_string($key) ? $key : (string) $key;

            if (array_key_exists($normalizedKey, $normalizedStrings)) {
                $normalized[$normalizedKey] = $normalizedStrings[$normalizedKey];
            }
        }

        return $normalized;
    }

    private function currentTenant(): Tenant
    {
        if (! tenancy()->initialized || ! tenancy()->tenant instanceof Tenant) {
            abort(403, 'Tenant context is required.');
        }

        return tenancy()->tenant;
    }
}
