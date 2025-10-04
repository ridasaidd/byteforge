<?php

namespace App\Http\Requests\Central;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->type === 'superadmin';
    }

    public function rules(): array
    {
        return [
            'id' => ['sometimes', 'string', 'max:255', 'unique:tenants,id', 'alpha_dash'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:tenants,slug', 'alpha_dash'],
            'domain' => ['required', 'string', 'max:255', 'unique:domains,domain'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:active,inactive,suspended'],
        ];
    }
}
