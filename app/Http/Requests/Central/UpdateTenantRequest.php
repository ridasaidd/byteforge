<?php

namespace App\Http\Requests\Central;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->type === 'superadmin';
    }

    public function rules(): array
    {
        $tenant = $this->route('tenant');
        $currentDomain = $tenant->domains()->first();

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'domain' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('domains', 'domain')->ignore($currentDomain?->id),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:active,inactive,suspended'],
        ];
    }
}
