<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MechanicWorkshop;
use App\Services\WorkshopSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MechanicWorkshopController extends Controller
{
    public function __construct(private readonly WorkshopSearchService $search) {}

    /**
     * Public: search workshops by location (no auth required).
     */
    public function search(Request $request): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $validated = $request->validate([
            'lat'       => ['nullable', 'numeric', 'between:-90,90'],
            'lng'       => ['nullable', 'numeric', 'between:-180,180'],
            'radius_km' => ['nullable', 'numeric', 'min:1', 'max:500'],
            'city'      => ['nullable', 'string', 'max:100'],
            'query'     => ['nullable', 'string', 'max:200'],
            'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $results = $this->search->search(
            tenantId: $tenantId,
            lat: isset($validated['lat']) ? (float) $validated['lat'] : null,
            lng: isset($validated['lng']) ? (float) $validated['lng'] : null,
            radiusKm: (float) ($validated['radius_km'] ?? 50),
            city: $validated['city'] ?? null,
            query: $validated['query'] ?? null,
            perPage: (int) ($validated['per_page'] ?? 15),
        );

        return response()->json([
            'data' => $results->items(),
            'meta' => [
                'current_page' => $results->currentPage(),
                'last_page'    => $results->lastPage(),
                'per_page'     => $results->perPage(),
                'total'        => $results->total(),
            ],
        ]);
    }

    /**
     * Public: list available cities for the tenant's workshops.
     */
    public function cities(): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $cities = $this->search->availableCities($tenantId);

        return response()->json(['data' => $cities]);
    }

    /**
     * Public: get a single workshop's details.
     */
    public function show(int $id): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $workshop = MechanicWorkshop::forTenant($tenantId)
            ->active()
            ->with(['services' => fn ($q) => $q->active()->orderBy('sort_order'), 'owner:id,name'])
            ->findOrFail($id);

        return response()->json(['data' => $workshop]);
    }

    /**
     * Authenticated (workshop_owner / admin): create a new workshop.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'address'     => ['required', 'string', 'max:500'],
            'city'        => ['required', 'string', 'max:100'],
            'state'       => ['nullable', 'string', 'max:100'],
            'country'     => ['nullable', 'string', 'size:2'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'latitude'    => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'   => ['nullable', 'numeric', 'between:-180,180'],
            'phone'       => ['nullable', 'string', 'max:30'],
            'email'       => ['nullable', 'email', 'max:255'],
            'website'     => ['nullable', 'url', 'max:500'],
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['owner_user_id'] = $request->user()->id;

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $count = 1;
        while (MechanicWorkshop::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $count++;
        }
        $validated['slug'] = $slug;

        $workshop = MechanicWorkshop::create($validated);

        return response()->json(['data' => $workshop], 201);
    }

    /**
     * Authenticated: update a workshop (owner or admin).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($id);

        // Non-admin users may only edit their own workshop
        if (! $user->hasRole('admin') && (int) $workshop->owner_user_id !== $user->id) {
            abort(403, 'You do not have permission to edit this workshop.');
        }

        $validated = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'address'     => ['sometimes', 'string', 'max:500'],
            'city'        => ['sometimes', 'string', 'max:100'],
            'state'       => ['nullable', 'string', 'max:100'],
            'country'     => ['nullable', 'string', 'size:2'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'latitude'    => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'   => ['nullable', 'numeric', 'between:-180,180'],
            'phone'       => ['nullable', 'string', 'max:30'],
            'email'       => ['nullable', 'email', 'max:255'],
            'website'     => ['nullable', 'url', 'max:500'],
            'status'      => ['nullable', 'in:active,inactive,pending'],
        ]);

        $workshop->update($validated);

        return response()->json(['data' => $workshop->fresh()]);
    }

    /**
     * Authenticated (admin only): delete a workshop.
     */
    public function destroy(int $id): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($id);
        $workshop->delete();

        return response()->json(['message' => 'Workshop deleted.']);
    }
}
