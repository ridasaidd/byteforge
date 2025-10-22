<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class CreateFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;
        
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $query = \App\Models\MediaFolder::where('tenant_id', $tenantId)
                        ->where('name', $value)
                        ->where('parent_id', $this->input('parent_id'));
                    
                    if ($query->exists()) {
                        $fail('A folder with this name already exists in this location.');
                    }
                },
            ],
            'parent_id' => ['nullable', 'integer', 'exists:media_folders,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Folder name is required.',
            'name.max' => 'Folder name must not exceed 255 characters.',
            'parent_id.exists' => 'The selected parent folder does not exist.',
        ];
    }
}
