<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UploadImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Auth::check();
    }

    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,gif,webp,svg',
                'max:10240', // 10MB in kilobytes
            ],
            'folder_id' => [
                'nullable', 'integer',
                // Scope to current tenant — prevents uploading into
                // another tenant's folder (cross-tenant IDOR).
                Rule::exists('media_folders', 'id')->where(function ($query) {
                    $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;
                    $query->where('tenant_id', $tenantId);
                }),
            ],
            'title' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Please select an image to upload.',
            'image.image' => 'The file must be an image.',
            'image.mimes' => 'Only JPG, PNG, GIF, WebP, and SVG images are allowed.',
            'image.max' => 'Image size must not exceed 10MB.',
            'folder_id.exists' => 'The selected folder does not exist.',
        ];
    }
}
