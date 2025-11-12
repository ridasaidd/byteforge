<?php

namespace App\Actions\Api\Tenant;

use App\Models\Page;
use App\Services\PuckCompilerService;
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
                Rule::unique('pages')->where(function ($query) {
                    return $query->where('tenant_id', tenancy()->tenant->id);
                })->ignore($page->id),
            ],
            'page_type' => 'sometimes|required|string|in:general,home,about,contact',
            'puck_data' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'status' => 'sometimes|required|string|in:draft,published,archived',
            'layout_id' => 'nullable|exists:layouts,id',
            'header_id' => 'nullable|exists:theme_parts,id',
            'footer_id' => 'nullable|exists:theme_parts,id',
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

        $oldStatus = $page->status;
        $page->update($validated);

        // Recompile if:
        // - Status changed to published, OR
        // - Already published and puck_data changed, OR
        // - Already published and layout/header/footer changed
        $shouldCompile = (
            ($validated['status'] ?? $page->status) === 'published' &&
            (
                $oldStatus !== 'published' ||
                isset($validated['puck_data']) ||
                isset($validated['layout_id']) ||
                isset($validated['header_id']) ||
                isset($validated['footer_id'])
            )
        );

        if ($shouldCompile) {
            $compiler = app(PuckCompilerService::class);
            $page->puck_data_compiled = $compiler->compilePage($page);
            $page->save();
        }

        return $page->fresh();
    }
}
