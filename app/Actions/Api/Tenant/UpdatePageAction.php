<?php

namespace App\Actions\Api\Tenant;

use App\Models\Page;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UpdatePageAction
{
    public function execute(Page $page, array $data): Page
    {
        $validated = Validator::make($data, [
            'title' => 'sometimes|required|string|max:255',
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('pages')->where(function ($query) use ($page) {
                    return $query->where('tenant_id', tenancy()->tenant->id);
                })->ignore($page->id),
            ],
            'page_type' => 'sometimes|required|string|in:general,home,about,contact',
            'puck_data' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'status' => 'sometimes|required|string|in:draft,published,archived',
            'is_homepage' => 'boolean',
            'sort_order' => 'integer',
            'published_at' => 'nullable|date',
        ])->validate();

        // Ensure only one homepage per tenant
        if (isset($validated['is_homepage']) && $validated['is_homepage']) {
            Page::where('tenant_id', tenancy()->tenant->id)
                ->where('id', '!=', $page->id)
                ->where('is_homepage', true)
                ->update(['is_homepage' => false]);
        }

        $page->update($validated);

        return $page->fresh();
    }
}
