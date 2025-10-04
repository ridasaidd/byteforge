<?php

namespace App\Http\Requests\Central;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->type === 'superadmin';
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('permissions', 'name')->where('guard_name', $this->input('guard', 'api')),
            ],
            'guard' => ['sometimes', 'string', 'in:web,api'],
        ];
    }
}
