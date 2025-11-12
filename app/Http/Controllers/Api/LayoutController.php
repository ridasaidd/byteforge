<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Layout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LayoutController extends Controller
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
     * Display a listing of layouts
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Layout::whereNull('tenant_id')
            : Layout::where('tenant_id', $tenantId);

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $layouts = $query->with(['header', 'footer', 'sidebarLeft', 'sidebarRight'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $data = collect($layouts->items())->map(function ($layout) {
            return [
                'id' => $layout->id,
                'name' => $layout->name,
                'slug' => $layout->slug,
                'header_id' => $layout->header_id,
                'footer_id' => $layout->footer_id,
                'sidebar_left_id' => $layout->sidebar_left_id,
                'sidebar_right_id' => $layout->sidebar_right_id,
                'status' => $layout->status,
                'header' => $layout->header ? [
                    'id' => $layout->header->id,
                    'name' => $layout->header->name,
                    'type' => $layout->header->type,
                ] : null,
                'footer' => $layout->footer ? [
                    'id' => $layout->footer->id,
                    'name' => $layout->footer->name,
                    'type' => $layout->footer->type,
                ] : null,
                'sidebar_left' => $layout->sidebarLeft ? [
                    'id' => $layout->sidebarLeft->id,
                    'name' => $layout->sidebarLeft->name,
                    'type' => $layout->sidebarLeft->type,
                ] : null,
                'sidebar_right' => $layout->sidebarRight ? [
                    'id' => $layout->sidebarRight->id,
                    'name' => $layout->sidebarRight->name,
                    'type' => $layout->sidebarRight->type,
                ] : null,
                'created_at' => $layout->created_at->toISOString(),
                'updated_at' => $layout->updated_at->toISOString(),
            ];
        })->toArray();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $layouts->currentPage(),
                'last_page' => $layouts->lastPage(),
                'per_page' => $layouts->perPage(),
                'total' => $layouts->total(),
            ],
        ]);
    }

    /**
     * Store a newly created layout
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
                Rule::unique('layouts')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                }),
            ],
            'header_id' => 'nullable|exists:theme_parts,id',
            'footer_id' => 'nullable|exists:theme_parts,id',
            'sidebar_left_id' => 'nullable|exists:theme_parts,id',
            'sidebar_right_id' => 'nullable|exists:theme_parts,id',
            'status' => 'required|string|in:draft,published',
        ]);

        // Auto-generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);

            // Ensure uniqueness
            $count = 1;
            $originalSlug = $validated['slug'];
            $baseQuery = $tenantId === null
                ? Layout::whereNull('tenant_id')
                : Layout::where('tenant_id', $tenantId);

            while ((clone $baseQuery)->where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $count;
                $count++;
            }
        }

        $validated['tenant_id'] = $tenantId;

        $layout = Layout::create($validated);
        $layout->load(['header', 'footer', 'sidebarLeft', 'sidebarRight']);

        return response()->json([
            'data' => [
                'id' => $layout->id,
                'name' => $layout->name,
                'slug' => $layout->slug,
                'header_id' => $layout->header_id,
                'footer_id' => $layout->footer_id,
                'sidebar_left_id' => $layout->sidebar_left_id,
                'sidebar_right_id' => $layout->sidebar_right_id,
                'status' => $layout->status,
                'header' => $layout->header ? [
                    'id' => $layout->header->id,
                    'name' => $layout->header->name,
                    'type' => $layout->header->type,
                ] : null,
                'footer' => $layout->footer ? [
                    'id' => $layout->footer->id,
                    'name' => $layout->footer->name,
                    'type' => $layout->footer->type,
                ] : null,
                'sidebar_left' => $layout->sidebarLeft ? [
                    'id' => $layout->sidebarLeft->id,
                    'name' => $layout->sidebarLeft->name,
                    'type' => $layout->sidebarLeft->type,
                ] : null,
                'sidebar_right' => $layout->sidebarRight ? [
                    'id' => $layout->sidebarRight->id,
                    'name' => $layout->sidebarRight->name,
                    'type' => $layout->sidebarRight->type,
                ] : null,
                'created_at' => $layout->created_at->toISOString(),
                'updated_at' => $layout->updated_at->toISOString(),
            ]
        ], 201);
    }

    /**
     * Display the specified layout
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Layout::whereNull('tenant_id')
            : Layout::where('tenant_id', $tenantId);

        $layout = $query->with(['header', 'footer', 'sidebarLeft', 'sidebarRight'])
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $layout->id,
                'name' => $layout->name,
                'slug' => $layout->slug,
                'header_id' => $layout->header_id,
                'footer_id' => $layout->footer_id,
                'sidebar_left_id' => $layout->sidebar_left_id,
                'sidebar_right_id' => $layout->sidebar_right_id,
                'status' => $layout->status,
                'header' => $layout->header ? [
                    'id' => $layout->header->id,
                    'name' => $layout->header->name,
                    'type' => $layout->header->type,
                ] : null,
                'footer' => $layout->footer ? [
                    'id' => $layout->footer->id,
                    'name' => $layout->footer->name,
                    'type' => $layout->footer->type,
                ] : null,
                'sidebar_left' => $layout->sidebarLeft ? [
                    'id' => $layout->sidebarLeft->id,
                    'name' => $layout->sidebarLeft->name,
                    'type' => $layout->sidebarLeft->type,
                ] : null,
                'sidebar_right' => $layout->sidebarRight ? [
                    'id' => $layout->sidebarRight->id,
                    'name' => $layout->sidebarRight->name,
                    'type' => $layout->sidebarRight->type,
                ] : null,
                'created_at' => $layout->created_at->toISOString(),
                'updated_at' => $layout->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Update the specified layout
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Layout::whereNull('tenant_id')
            : Layout::where('tenant_id', $tenantId);

        $layout = $query->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('layouts')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                })->ignore($id),
            ],
            'header_id' => 'nullable|exists:theme_parts,id',
            'footer_id' => 'nullable|exists:theme_parts,id',
            'sidebar_left_id' => 'nullable|exists:theme_parts,id',
            'sidebar_right_id' => 'nullable|exists:theme_parts,id',
            'status' => 'sometimes|required|string|in:draft,published',
        ]);

        $layout->update($validated);
        $layout->load(['header', 'footer', 'sidebarLeft', 'sidebarRight']);

        return response()->json([
            'data' => [
                'id' => $layout->id,
                'name' => $layout->name,
                'slug' => $layout->slug,
                'header_id' => $layout->header_id,
                'footer_id' => $layout->footer_id,
                'sidebar_left_id' => $layout->sidebar_left_id,
                'sidebar_right_id' => $layout->sidebar_right_id,
                'status' => $layout->status,
                'header' => $layout->header ? [
                    'id' => $layout->header->id,
                    'name' => $layout->header->name,
                    'type' => $layout->header->type,
                ] : null,
                'footer' => $layout->footer ? [
                    'id' => $layout->footer->id,
                    'name' => $layout->footer->name,
                    'type' => $layout->footer->type,
                ] : null,
                'sidebar_left' => $layout->sidebarLeft ? [
                    'id' => $layout->sidebarLeft->id,
                    'name' => $layout->sidebarLeft->name,
                    'type' => $layout->sidebarLeft->type,
                ] : null,
                'sidebar_right' => $layout->sidebarRight ? [
                    'id' => $layout->sidebarRight->id,
                    'name' => $layout->sidebarRight->name,
                    'type' => $layout->sidebarRight->type,
                ] : null,
                'created_at' => $layout->created_at->toISOString(),
                'updated_at' => $layout->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Remove the specified layout
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? Layout::whereNull('tenant_id')
            : Layout::where('tenant_id', $tenantId);

        $layout = $query->findOrFail($id);
        $layout->delete();

        return response()->json(['message' => 'Layout deleted successfully'], 200);
    }
}
