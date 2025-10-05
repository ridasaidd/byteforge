<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UploadMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // User must be authenticated
        return Auth::check();
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:10240', // 10MB in kilobytes
            ],
            'folder_id' => ['nullable', 'integer', 'exists:media_folders,id'],
            'collection' => ['nullable', 'string', 'max:255'], // Allow any collection name
            'custom_properties' => ['nullable', 'array'],
            'custom_properties.title' => ['nullable', 'string', 'max:255'],
            'custom_properties.alt_text' => ['nullable', 'string', 'max:500'],
            'custom_properties.description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Please select a file to upload.',
            'file.max' => 'File size must not exceed 10MB.',
            'folder_id.exists' => 'The selected folder does not exist.',
        ];
    }
}
