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
        $allowedExtensions = implode(',', config('media-upload.allowed_extensions'));
        $allowedMimeTypes = implode(',', config('media-upload.allowed_mime_types'));
        $maxFileSize = config('media-upload.max_file_size');
        
        return [
            'file' => [
                'required',
                'file',
                'max:' . $maxFileSize, // From config
                'mimes:' . $allowedExtensions, // Whitelist from config
                'mimetypes:' . $allowedMimeTypes, // Double validation from config
            ],
            'folder_id' => ['nullable', 'integer', 'exists:media_folders,id'],
            'collection' => ['nullable', 'string', 'max:255'],
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
            'file.mimes' => 'Invalid file type. Allowed types: JPG, PNG, GIF, WebP, SVG, PDF, DOC, DOCX, XLS, XLSX, TXT, MP4, MPEG, MOV, AVI, WebM.',
            'file.mimetypes' => 'Invalid file type detected. Only safe file types are allowed.',
            'folder_id.exists' => 'The selected folder does not exist.',
        ];
    }
}
