<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PageTemplateController extends Controller
{
    /**
     * Get tenant ID
     */
    private function getTenantId(): ?string
    {
        if (tenancy()->initialized) {
            return tenancy()->tenant->id;
        }
        return null;
    }

    /**
     * Display a listing of page templates
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? PageTemplate::whereNull('tenant_id')
            : PageTemplate::where('tenant_id', $tenantId);

        // Apply filters
        if ($request->has('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->has('theme_id')) {
            $query->where('theme_id', $request->input('theme_id'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $pageTemplates = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $data = collect($pageTemplates->items())->map(function ($template) {
            return [
                'id' => $template->id,
                'theme_id' => $template->theme_id,
                'name' => $template->name,
                'slug' => $template->slug,
                'description' => $template->description,
                'category' => $template->category,
                'preview_image' => $template->preview_image,
                'puck_data' => $template->puck_data,
                'meta' => $template->meta,
                'is_active' => $template->is_active,
                'usage_count' => $template->usage_count,
                'created_at' => $template->created_at->toISOString(),
                'updated_at' => $template->updated_at->toISOString(),
            ];
        })->toArray();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $pageTemplates->currentPage(),
                'last_page' => $pageTemplates->lastPage(),
                'per_page' => $pageTemplates->perPage(),
                'total' => $pageTemplates->total(),
            ],
        ]);
    }

    /**
     * Store a newly created page template
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('page_templates')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                }),
            ],
            'theme_id' => 'nullable|integer|exists:themes,id',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'preview_image' => 'nullable|string',
            'puck_data' => 'nullable|array',
            'meta' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        // Auto-generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);

            // Ensure uniqueness
            $count = 1;
            $originalSlug = $validated['slug'];
            $baseQuery = $tenantId === null
                ? PageTemplate::whereNull('tenant_id')
                : PageTemplate::where('tenant_id', $tenantId);

            while ((clone $baseQuery)->where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $count;
                $count++;
            }
        }

        $validated['tenant_id'] = $tenantId;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['usage_count'] = 0;

        $pageTemplate = PageTemplate::create($validated);

        return response()->json([
            'data' => [
                'id' => $pageTemplate->id,
                'theme_id' => $pageTemplate->theme_id,
                'name' => $pageTemplate->name,
                'slug' => $pageTemplate->slug,
                'description' => $pageTemplate->description,
                'category' => $pageTemplate->category,
                'preview_image' => $pageTemplate->preview_image,
                'puck_data' => $pageTemplate->puck_data,
                'meta' => $pageTemplate->meta,
                'is_active' => $pageTemplate->is_active,
                'usage_count' => $pageTemplate->usage_count,
                'created_at' => $pageTemplate->created_at->toISOString(),
                'updated_at' => $pageTemplate->updated_at->toISOString(),
            ]
        ], 201);
    }

    /**
     * Display the specified page template
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? PageTemplate::whereNull('tenant_id')
            : PageTemplate::where('tenant_id', $tenantId);

        $pageTemplate = $query->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $pageTemplate->id,
                'theme_id' => $pageTemplate->theme_id,
                'name' => $pageTemplate->name,
                'slug' => $pageTemplate->slug,
                'description' => $pageTemplate->description,
                'category' => $pageTemplate->category,
                'preview_image' => $pageTemplate->preview_image,
                'puck_data' => $pageTemplate->puck_data,
                'meta' => $pageTemplate->meta,
                'is_active' => $pageTemplate->is_active,
                'usage_count' => $pageTemplate->usage_count,
                'created_at' => $pageTemplate->created_at->toISOString(),
                'updated_at' => $pageTemplate->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Update the specified page template
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? PageTemplate::whereNull('tenant_id')
            : PageTemplate::where('tenant_id', $tenantId);

        $pageTemplate = $query->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('page_templates')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                })->ignore($id),
            ],
            'theme_id' => 'nullable|integer|exists:themes,id',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'preview_image' => 'nullable|string',
            'puck_data' => 'nullable|array',
            'meta' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $pageTemplate->update($validated);

        return response()->json([
            'data' => [
                'id' => $pageTemplate->id,
                'theme_id' => $pageTemplate->theme_id,
                'name' => $pageTemplate->name,
                'slug' => $pageTemplate->slug,
                'description' => $pageTemplate->description,
                'category' => $pageTemplate->category,
                'preview_image' => $pageTemplate->preview_image,
                'puck_data' => $pageTemplate->puck_data,
                'meta' => $pageTemplate->meta,
                'is_active' => $pageTemplate->is_active,
                'usage_count' => $pageTemplate->usage_count,
                'created_at' => $pageTemplate->created_at->toISOString(),
                'updated_at' => $pageTemplate->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Remove the specified page template
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? PageTemplate::whereNull('tenant_id')
            : PageTemplate::where('tenant_id', $tenantId);

        $pageTemplate = $query->findOrFail($id);
        $pageTemplate->delete();

        return response()->json(['message' => 'Page template deleted successfully'], 200);
    }
}
