<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PageController extends Controller
{
    /**
     * Display a listing of pages
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.pages.index works']);
    }

    /**
     * Store a newly created page
     */
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.pages.store works']);
    }

    /**
     * Display the specified page
     */
    public function show(Page $page): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.pages.show works']);
    }

    /**
     * Update the specified page
     */
    public function update(Request $request, Page $page): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.pages.update works']);
    }

    /**
     * Remove the specified page
     */
    public function destroy(Page $page): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.pages.destroy works']);
    }
}