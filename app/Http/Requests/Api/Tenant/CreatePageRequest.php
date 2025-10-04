<?php

namespace App\Http\Requests\Api\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'slug' => [
                'required',
                'string',
                'max:255',
                Rule::unique('pages')->where(function ($query) {
                    return $query->where('tenant_id', tenancy()->tenant->id);
                }),
            ],
            'page_type' => 'required|string|in:general,home,about,contact',
            'puck_data' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'status' => 'required|string|in:draft,published,archived',
            'is_homepage' => 'boolean',
            'sort_order' => 'integer',
            'published_at' => 'nullable|date',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'title.required' => 'The page title is required.',
            'slug.required' => 'The page slug is required.',
            'slug.unique' => 'A page with this slug already exists for this tenant.',
            'page_type.required' => 'The page type is required.',
            'page_type.in' => 'The page type must be one of: general, home, about, contact.',
            'status.required' => 'The page status is required.',
            'status.in' => 'The page status must be one of: draft, published, archived.',
        ];
    }
}
