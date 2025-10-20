<?php

namespace App\Actions\Api\Tenant;

use App\Models\Page;
use Lorisleiva\Actions\Concerns\AsAction;

class ListPagesAction
{
    use AsAction;

    public function handle(array $filters = []): array
    {
        return $this->execute($filters);
    }

    public function execute(array $filters = []): array
    {
        $query = Page::where('tenant_id', tenancy()->tenant->id);

        // Apply filters
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['page_type'])) {
            $query->where('page_type', $filters['page_type']);
        }

        $pages = $query->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return $pages->map(function ($page) {
            return [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'status' => $page->status,
                'is_homepage' => $page->is_homepage,
                'sort_order' => $page->sort_order,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
            ];
        })->toArray();
    }
}
