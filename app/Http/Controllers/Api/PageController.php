<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Actions\Api\Tenant\ListPagesAction;
use App\Actions\Api\Tenant\CreatePageAction;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PageController extends Controller
{
    /**
     * Display a listing of pages
     */
    public function index(Request $request): JsonResponse
    {
        $action = new ListPagesAction();
        $pages = $action->execute($request->only(['status', 'page_type']));

        return response()->json($pages);
    }

    /**
     * Store a newly created page
     */
    public function store(Request $request): JsonResponse
    {
        $action = new CreatePageAction();
        $page = $action->execute($request->all(), Auth::user());

        return response()->json($page, 201);
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

        return response()->json($page);
    }

    /**
     * Update the specified page
     */
    public function update(Request $request, Page $page): JsonResponse
    {
        // Ensure page belongs to current tenant
        if ($page->tenant_id !== tenancy()->tenant->id) {
            abort(404);
        }

        // TODO: Create UpdatePageAction
        $page->update($request->validated());

        return response()->json($page);
    }

    /**
     * Remove the specified page
     */
    public function destroy(Page $page): JsonResponse
    {
        // Ensure page belongs to current tenant
        if ($page->tenant_id !== tenancy()->tenant->id) {
            abort(404);
        }

        $page->delete();

        return response()->json(['message' => 'Page deleted successfully']);
    }
}
