<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * WorkshopController — CRUD endpoints for managing workshop listings.
 *
 * These routes sit behind auth + tenant membership middleware and are used
 * by the Tenant CMS to create, update, and delete workshop profiles.
 */
class WorkshopController extends Controller
{
    /**
     * Return the current tenant ID from the tenancy context.
     */
    private function tenantId(): string
    {
        return (string) tenancy()->tenant->id;
    }

    /**
     * List all workshops for the current tenant.
     *
     * GET /api/workshops
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId();

        $query = Workshop::where('tenant_id', $tenantId);

        if ($request->has('search')) {
            $search = str_replace(['%', '_'], ['\%', '\_'], $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        $workshops = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => $workshops->items(),
            'meta' => [
                'current_page' => $workshops->currentPage(),
                'last_page' => $workshops->lastPage(),
                'per_page' => $workshops->perPage(),
                'total' => $workshops->total(),
            ],
        ]);
    }

    /**
     * Create a new workshop.
     *
     * POST /api/workshops
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'specializations' => 'nullable|array',
            'specializations.*' => 'string|max:100',
            'opening_hours' => 'nullable|array',
            'is_active' => 'boolean',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $workshop = Workshop::create(array_merge($validated, [
            'tenant_id' => $this->tenantId(),
        ]));

        return response()->json(['data' => $workshop], 201);
    }

    /**
     * Show a single workshop.
     *
     * GET /api/workshops/{workshop}
     */
    public function show(Workshop $workshop): JsonResponse
    {
        $this->authorizeWorkshop($workshop);

        $workshop->load('owner:id,name,email');

        return response()->json(['data' => $workshop]);
    }

    /**
     * Update an existing workshop.
     *
     * PUT|PATCH /api/workshops/{workshop}
     */
    public function update(Request $request, Workshop $workshop): JsonResponse
    {
        $this->authorizeWorkshop($workshop);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'specializations' => 'nullable|array',
            'specializations.*' => 'string|max:100',
            'opening_hours' => 'nullable|array',
            'is_active' => 'boolean',
            'is_verified' => 'boolean',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $workshop->update($validated);

        return response()->json(['data' => $workshop->fresh()]);
    }

    /**
     * Delete a workshop.
     *
     * DELETE /api/workshops/{workshop}
     */
    public function destroy(Workshop $workshop): JsonResponse
    {
        $this->authorizeWorkshop($workshop);

        $workshop->delete();

        return response()->json(['message' => 'Workshop deleted.']);
    }

    /**
     * Ensure the workshop belongs to the current tenant.
     */
    private function authorizeWorkshop(Workshop $workshop): void
    {
        if ($workshop->tenant_id !== $this->tenantId()) {
            abort(403, 'Access denied.');
        }
    }
}
