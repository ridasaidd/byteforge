<?php

namespace App\Http\Requests\Api\Tenant;

use App\Actions\Api\NormalizeInputFieldsAction;
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
        $tenantId = $this->currentTenantId();

        return [
            'title' => 'required|string|max:255',
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('pages')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }

                    return $query->where('tenant_id', $tenantId);
                }),
            ],
            'page_type' => 'required|string|in:general,home,about,contact,blog,service,product,custom',
            'puck_data' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'status' => 'required|string|in:draft,published,archived',
            'is_homepage' => 'boolean',
            'sort_order' => 'nullable|integer',
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
            'slug.unique' => 'A page with this slug already exists for this tenant.',
            'page_type.required' => 'The page type is required.',
            'page_type.in' => 'The page type must be one of: general, home, about, contact, blog, service, product, custom.',
            'status.required' => 'The page status is required.',
            'status.in' => 'The page status must be one of: draft, published, archived.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->replace(app(NormalizeInputFieldsAction::class)(
            $this->all(),
            singleLineFields: ['title'],
        ));
    }

    private function currentTenantId(): ?string
    {
        return tenancy()->initialized ? (string) tenancy()->tenant->id : null;
    }
}
