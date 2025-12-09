<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ThemePart;
use App\Services\PuckCompilerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ThemePartController extends Controller
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
     * Display a listing of theme parts
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? ThemePart::whereNull('tenant_id')
            : ThemePart::where('tenant_id', $tenantId);

        // Apply filters
        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

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
        $themeParts = $query->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $data = collect($themeParts->items())->map(function ($part) {
            return [
                'id' => $part->id,
                'name' => $part->name,
                'slug' => $part->slug,
                'type' => $part->type,
                'theme_id' => $part->theme_id,
                'puck_data_raw' => $part->puck_data_raw,
                'puck_data_compiled' => $part->puck_data_compiled,
                'status' => $part->status,
                'sort_order' => $part->sort_order,
                'created_at' => $part->created_at->toISOString(),
                'updated_at' => $part->updated_at->toISOString(),
            ];
        })->toArray();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $themeParts->currentPage(),
                'last_page' => $themeParts->lastPage(),
                'per_page' => $themeParts->perPage(),
                'total' => $themeParts->total(),
            ],
        ]);
    }

    /**
     * Store a newly created theme part
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
                Rule::unique('theme_parts')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                }),
            ],
            'type' => 'required|string|in:header,footer,sidebar_left,sidebar_right,section',
            'theme_id' => 'nullable|integer|exists:themes,id',
            'puck_data_raw' => 'nullable|array',
            'status' => 'required|string|in:draft,published',
            'sort_order' => 'nullable|integer',
        ]);

        // Auto-generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);

            // Ensure uniqueness
            $count = 1;
            $originalSlug = $validated['slug'];
            $baseQuery = $tenantId === null
                ? ThemePart::whereNull('tenant_id')
                : ThemePart::where('tenant_id', $tenantId);

            while ((clone $baseQuery)->where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $count;
                $count++;
            }
        }

        $validated['tenant_id'] = $tenantId;
        $validated['created_by'] = $request->user()->id;

        $themePart = ThemePart::create($validated);

        // Compile if status is published
        if ($themePart->status === 'published') {
            $compiler = app(PuckCompilerService::class);
            $themePart->puck_data_compiled = $compiler->compileThemePart($themePart);
            $themePart->save();
        }

        return response()->json([
            'data' => [
                'id' => $themePart->id,
                'name' => $themePart->name,
                'slug' => $themePart->slug,
                'type' => $themePart->type,
                'theme_id' => $themePart->theme_id,
                'puck_data_raw' => $themePart->puck_data_raw,
                'puck_data_compiled' => $themePart->puck_data_compiled,
                'status' => $themePart->status,
                'sort_order' => $themePart->sort_order,
                'created_at' => $themePart->created_at->toISOString(),
                'updated_at' => $themePart->updated_at->toISOString(),
            ]
        ], 201);
    }

    /**
     * Display the specified theme part
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? ThemePart::whereNull('tenant_id')
            : ThemePart::where('tenant_id', $tenantId);

        $themePart = $query->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $themePart->id,
                'name' => $themePart->name,
                'slug' => $themePart->slug,
                'type' => $themePart->type,
                'theme_id' => $themePart->theme_id,
                'puck_data_raw' => $themePart->puck_data_raw,
                'puck_data_compiled' => $themePart->puck_data_compiled,
                'status' => $themePart->status,
                'sort_order' => $themePart->sort_order,
                'created_at' => $themePart->created_at->toISOString(),
                'updated_at' => $themePart->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Update the specified theme part
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? ThemePart::whereNull('tenant_id')
            : ThemePart::where('tenant_id', $tenantId);

        $themePart = $query->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('theme_parts')->where(function ($query) use ($tenantId) {
                    if ($tenantId === null) {
                        return $query->whereNull('tenant_id');
                    }
                    return $query->where('tenant_id', $tenantId);
                })->ignore($id),
            ],
            'type' => 'sometimes|required|string|in:header,footer,sidebar_left,sidebar_right,section',
            'theme_id' => 'nullable|integer|exists:themes,id',
            'puck_data_raw' => 'nullable|array',
            'status' => 'sometimes|required|string|in:draft,published',
            'sort_order' => 'nullable|integer',
        ]);

        $oldStatus = $themePart->status;
        $themePart->update($validated);

        // Recompile if status changed to published OR if already published and puck_data changed
        $shouldCompile = (
            ($validated['status'] ?? $themePart->status) === 'published' &&
            ($oldStatus !== 'published' || isset($validated['puck_data_raw']))
        );

        if ($shouldCompile) {
            $compiler = app(PuckCompilerService::class);
            $themePart->puck_data_compiled = $compiler->compileThemePart($themePart);
            $themePart->save();
        }

        return response()->json([
            'data' => [
                'id' => $themePart->id,
                'name' => $themePart->name,
                'slug' => $themePart->slug,
                'type' => $themePart->type,
                'theme_id' => $themePart->theme_id,
                'puck_data_raw' => $themePart->puck_data_raw,
                'puck_data_compiled' => $themePart->puck_data_compiled,
                'status' => $themePart->status,
                'sort_order' => $themePart->sort_order,
                'created_at' => $themePart->created_at->toISOString(),
                'updated_at' => $themePart->updated_at->toISOString(),
            ]
        ]);
    }

    /**
     * Remove the specified theme part
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId();
        $query = $tenantId === null
            ? ThemePart::whereNull('tenant_id')
            : ThemePart::where('tenant_id', $tenantId);

        $themePart = $query->findOrFail($id);
        $themePart->delete();

        return response()->json(['message' => 'Theme part deleted successfully'], 200);
    }
}
