<?php

namespace App\Actions\Api\Tenant;

use App\Models\Page;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Lorisleiva\Actions\Concerns\AsAction;

class CreatePageAction
{
    use AsAction;

    public function handle(array $data, $user = null): Page
    {
        return $this->execute($data, $user);
    }

    public function execute(array $data, $user = null): Page
    {
        $validated = Validator::make($data, [
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
        ])->validate();

        // Ensure only one homepage per tenant
        if ($validated['is_homepage'] ?? false) {
            Page::where('tenant_id', tenancy()->tenant->id)
                ->where('is_homepage', true)
                ->update(['is_homepage' => false]);
        }

        return Page::create([
            'tenant_id' => tenancy()->tenant->id,
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'page_type' => $validated['page_type'],
            'puck_data' => $validated['puck_data'] ?? [],
            'meta_data' => $validated['meta_data'] ?? [],
            'status' => $validated['status'],
            'is_homepage' => $validated['is_homepage'] ?? false,
            'sort_order' => $validated['sort_order'] ?? 0,
            'created_by' => $user?->id,
            'published_at' => $validated['published_at'] ?? null,
        ]);
    }
}
