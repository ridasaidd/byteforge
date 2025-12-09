<?php

namespace App\Http\Controllers\Api;

use App\Models\Page;
use App\Http\Controllers\Controller;
use App\Services\PuckCompilerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PageController extends Controller
{
    /**
     * Get tenant ID - uses null for central app, or tenant ID for tenant context
     */
    private function getTenantId(): ?string
    {
        // Check if we're in tenant context
        if (tenancy()->initialized) {
            return tenancy()->tenant->id;
        }

        // Central context - use null for central pages
        return null;
    }

    /**
     * Display a listing of pages
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('page_type')) {
            $query->where('page_type', $request->input('page_type'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $pages = $query->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        // Transform to match expected frontend format
        $data = collect($pages->items())->map(function ($page) {
            return [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'puck_data' => $page->puck_data,
                'puck_data_compiled' => $page->puck_data_compiled,
                'meta_data' => $page->meta_data,
                'status' => $page->status,
                'layout_id' => $page->layout_id,
                'header_id' => $page->header_id,
                'footer_id' => $page->footer_id,
                'is_homepage' => $page->is_homepage,
                'sort_order' => $page->sort_order,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
            ];
        })->toArray();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $pages->currentPage(),
                'last_page' => $pages->lastPage(),
                'per_page' => $pages->perPage(),
                'total' => $pages->total(),
            ],
        ]);
    }

    /**
     * Store a newly created page
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();

        $validated = $request->validate([
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
            'layout_id' => 'nullable|exists:layouts,id',
            'header_id' => 'nullable|exists:theme_parts,id',
            'footer_id' => 'nullable|exists:theme_parts,id',
            'is_homepage' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        // Auto-generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);

            // Ensure uniqueness
            $count = 1;
            $originalSlug = $validated['slug'];
            $baseQuery = $tenantId === null
                ? Page::whereNull('tenant_id')
                : Page::where('tenant_id', $tenantId);

            while ((clone $baseQuery)->where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $count;
                $count++;
            }
        }

        // Auto-set as homepage if page_type is 'home'
        if ($validated['page_type'] === 'home') {
            $validated['is_homepage'] = true;

            // Unset any existing homepage
            $query = $tenantId === null
                ? Page::whereNull('tenant_id')
                : Page::where('tenant_id', $tenantId);

            $query->where('is_homepage', true)
                ->update(['is_homepage' => false]);
        }

        // Add tenant_id and created_by
        $validated['tenant_id'] = $tenantId;
        $validated['created_by'] = $request->user()->id;

        // Set published_at if status is published
        if ($validated['status'] === 'published' && !isset($validated['published_at'])) {
            $validated['published_at'] = now();
        }

        $page = Page::create($validated);

        // Compile if status is published and puck_data exists
        if ($page->status === 'published' && !empty($page->puck_data)) {
            $compiler = app(PuckCompilerService::class);
            $page->puck_data_compiled = $compiler->compilePage($page);
            $page->save();
        }

        return response()->json([
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'puck_data' => $page->puck_data,
                'puck_data_compiled' => $page->puck_data_compiled,
                'meta_data' => $page->meta_data,
                'status' => $page->status,
                'layout_id' => $page->layout_id,
                'header_id' => $page->header_id,
                'footer_id' => $page->footer_id,
                'is_homepage' => $page->is_homepage,
                'sort_order' => $page->sort_order,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
            ]
        ], 201);
    }

    /**
     * Display the specified page
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        $page = $query->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'puck_data' => $page->puck_data,
                'puck_data_compiled' => $page->puck_data_compiled,
                'meta_data' => $page->meta_data,
                'status' => $page->status,
                'layout_id' => $page->layout_id,
                'header_id' => $page->header_id,
                'footer_id' => $page->footer_id,
                'is_homepage' => $page->is_homepage,
                'sort_order' => $page->sort_order,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Update the specified page
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        $page = $query->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('pages')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                })->ignore($id),
            ],
            'page_type' => 'sometimes|required|string|in:general,home,about,contact,blog,service,product,custom',
            'puck_data' => 'nullable|array',
            'meta_data' => 'nullable|array',
            'status' => 'sometimes|required|string|in:draft,published,archived',
            'layout_id' => 'nullable|exists:layouts,id',
            'header_id' => 'nullable|exists:theme_parts,id',
            'footer_id' => 'nullable|exists:theme_parts,id',
            'is_homepage' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        // Set published_at when status changes to published
        if (isset($validated['status']) && $validated['status'] === 'published' && !$page->published_at) {
            $validated['published_at'] = now();
        }

        // Auto-set as homepage if page_type is 'home'
        if (isset($validated['page_type']) && $validated['page_type'] === 'home') {
            $validated['is_homepage'] = true;

            // Unset any existing homepage
            $query = $tenantId === null
                ? Page::whereNull('tenant_id')
                : Page::where('tenant_id', $tenantId);

            $query->where('id', '!=', $id)
                ->where('is_homepage', true)
                ->update(['is_homepage' => false]);
        }

        $oldStatus = $page->status;
        $oldHeaderId = $page->header_id;
        $oldFooterId = $page->footer_id;
        
        $page->update($validated);

        // Recompile if:
        // - Status changed to published, OR
        // - Already published and (puck_data, header_id, or footer_id changed)
        $shouldCompile = (
            ($validated['status'] ?? $page->status) === 'published' &&
            (
                $oldStatus !== 'published' ||
                isset($validated['puck_data']) ||
                (isset($validated['header_id']) && $validated['header_id'] !== $oldHeaderId) ||
                (isset($validated['footer_id']) && $validated['footer_id'] !== $oldFooterId)
            )
        );

        if ($shouldCompile) {
            $compiler = app(PuckCompilerService::class);
            $page->puck_data_compiled = $compiler->compilePage($page);
            $page->save();
        }

        return response()->json([
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'puck_data' => $page->puck_data,
                'puck_data_compiled' => $page->puck_data_compiled,
                'meta_data' => $page->meta_data,
                'status' => $page->status,
                'layout_id' => $page->layout_id,
                'header_id' => $page->header_id,
                'footer_id' => $page->footer_id,
                'is_homepage' => $page->is_homepage,
                'sort_order' => $page->sort_order,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Remove the specified page
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        $page = $query->findOrFail($id);

        $page->delete();

        return response()->json(['message' => 'Page deleted successfully'], 200);
    }

    /**
     * Get a published page by slug (public route)
     */
    public function getBySlug(Request $request, string $slug): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        $page = $query->where('slug', $slug)
            ->where('status', 'published')
            ->with(['header', 'footer', 'layout.header', 'layout.footer'])
            ->firstOrFail();

        // Use compiled data (header + content + footer + metadata already merged during publish)
        $pageData = $page->puck_data_compiled ?? $page->puck_data;

        return response()->json([
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'puck_data' => $pageData, // Pre-compiled: header + content + footer + metadata merged!
                'meta_data' => $page->meta_data,
                'status' => $page->status,
                'is_homepage' => $page->is_homepage,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
                // No header/footer needed - already merged in puck_data_compiled!
            ]
        ])
        ->header('Cache-Control', 'public, max-age=3600') // Browser cache 1 hour
        ->header('ETag', md5(json_encode($pageData))); // Enable conditional requests
    }

    /**
     * Get the homepage (public route)
     */
    public function getHomepage(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        $page = $query->where('is_homepage', true)
            ->where('status', 'published')
            ->with(['header', 'footer', 'layout.header', 'layout.footer'])
            ->first();

        if (!$page) {
            return response()->json([
                'error' => 'Homepage not found',
                'message' => 'No homepage has been set yet.'
            ], 404);
        }

        // Use compiled data (header + content + footer + metadata already merged during publish)
        $pageData = $page->puck_data_compiled ?? $page->puck_data;

        return response()->json([
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'page_type' => $page->page_type,
                'puck_data' => $pageData, // Pre-compiled: header + content + footer + metadata merged!
                'meta_data' => $page->meta_data,
                'status' => $page->status,
                'is_homepage' => $page->is_homepage,
                'published_at' => $page->published_at?->toISOString(),
                'created_at' => $page->created_at->toISOString(),
                'updated_at' => $page->updated_at->toISOString(),
                // No header/footer needed - already merged in puck_data_compiled!
            ]
        ])
        ->header('Cache-Control', 'public, max-age=3600')
        ->header('ETag', md5(json_encode($pageData)));
    }
}
