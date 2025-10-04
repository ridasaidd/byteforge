<?php

namespace App\Http\Requests\Central;

use Illuminate\Foundation\Http\FormRequest;

class AddUserToTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->type === 'superadmin';
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,inactive,suspended'],
        ];
    }
}
