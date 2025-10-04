<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\Tenant\CreatePageAction;
use App\Actions\Api\Tenant\DeletePageAction;
use App\Actions\Api\Tenant\ListPagesAction;
use App\Actions\Api\Tenant\UpdatePageAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tenant\CreatePageRequest;
use App\Http\Requests\Api\Tenant\UpdatePageRequest;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PageController extends Controller
{
    /**
     * Display a listing of pages
     */
    public function index(Request $request, ListPagesAction $action): JsonResponse
    {
        $filters = $request->only(['status', 'page_type']);
        $pages = $action->execute($filters);

        return response()->json($pages);
    }

    /**
     * Store a newly created page
     */
    public function store(CreatePageRequest $request, CreatePageAction $action): JsonResponse
    {
        $page = $action->execute($request->validated(), $request->user());

        return response()->json([
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'page_type' => $page->page_type,
            'puck_data' => $page->puck_data,
            'meta_data' => $page->meta_data,
            'status' => $page->status,
            'is_homepage' => $page->is_homepage,
            'sort_order' => $page->sort_order,
            'published_at' => $page->published_at?->toISOString(),
            'created_at' => $page->created_at->toISOString(),
            'updated_at' => $page->updated_at->toISOString(),
        ], 201);
    }

    /**
     * Display the specified page
     */
    public function show(Page $page): JsonResponse
    {
        // Ensure page belongs to current tenant
        if ($page->tenant_id !== tenancy()->tenant->id) {
            abort(404);
        }

        return response()->json([
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'page_type' => $page->page_type,
            'puck_data' => $page->puck_data,
            'meta_data' => $page->meta_data,
            'status' => $page->status,
            'is_homepage' => $page->is_homepage,
            'sort_order' => $page->sort_order,
            'published_at' => $page->published_at?->toISOString(),
            'created_at' => $page->created_at->toISOString(),
            'updated_at' => $page->updated_at->toISOString(),
        ]);
    }

    /**
     * Update the specified page
     */
    public function update(UpdatePageRequest $request, Page $page, UpdatePageAction $action): JsonResponse
    {
        // Ensure page belongs to current tenant
        if ($page->tenant_id !== tenancy()->tenant->id) {
            abort(404);
        }

        $updatedPage = $action->execute($page, $request->validated());

        return response()->json([
            'id' => $updatedPage->id,
            'title' => $updatedPage->title,
            'slug' => $updatedPage->slug,
            'page_type' => $updatedPage->page_type,
            'puck_data' => $updatedPage->puck_data,
            'meta_data' => $updatedPage->meta_data,
            'status' => $updatedPage->status,
            'is_homepage' => $updatedPage->is_homepage,
            'sort_order' => $updatedPage->sort_order,
            'published_at' => $updatedPage->published_at?->toISOString(),
            'created_at' => $updatedPage->created_at->toISOString(),
            'updated_at' => $updatedPage->updated_at->toISOString(),
        ]);
    }

    /**
     * Remove the specified page
     */
    public function destroy(Page $page, DeletePageAction $action): JsonResponse
    {
        // Ensure page belongs to current tenant
        if ($page->tenant_id !== tenancy()->tenant->id) {
            abort(404);
        }

        $action->execute($page);

        return response()->json(['message' => 'Page deleted successfully'], 200);
    }
}
