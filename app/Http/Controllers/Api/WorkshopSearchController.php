<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * WorkshopSearchController — public, unauthenticated location-based search.
 *
 * These endpoints power the customer-facing "find a mechanic near me" feature.
 * No authentication is required so that anyone can search without registering.
 */
class WorkshopSearchController extends Controller
{
    /**
     * Search for workshops by location proximity.
     *
     * GET /api/workshops/search
     *
     * Query parameters:
     *   - lat      float   (required) Customer latitude
     *   - lng      float   (required) Customer longitude
     *   - radius   float   (optional) Search radius in km, default 50, max 500
     *   - per_page int     (optional) Results per page, default 15, max 100
     *   - page     int     (optional) Page number
     *   - q        string  (optional) Name/city text filter
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius' => 'nullable|numeric|min:1|max:500',
            'per_page' => 'nullable|integer|min:1|max:100',
            'q' => 'nullable|string|max:255',
        ]);

        $tenantId = (string) tenancy()->tenant->id;
        $lat = (float) $request->input('lat');
        $lng = (float) $request->input('lng');
        $radius = (float) $request->input('radius', 50);
        $perPage = min((int) $request->input('per_page', 15), 100);

        $query = Workshop::where('tenant_id', $tenantId)
            ->active()
            ->nearbyWithinKm($lat, $lng, $radius);

        if ($request->filled('q')) {
            $search = str_replace(['%', '_'], ['\%', '\_'], $request->input('q'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $workshops = $query->paginate($perPage);

        $items = collect($workshops->items())->map(fn (Workshop $w) => [
            'id' => $w->id,
            'name' => $w->name,
            'description' => $w->description,
            'address' => $w->address,
            'city' => $w->city,
            'postal_code' => $w->postal_code,
            'country' => $w->country,
            'latitude' => $w->latitude,
            'longitude' => $w->longitude,
            'phone' => $w->phone,
            'email' => $w->email,
            'website' => $w->website,
            'specializations' => $w->specializations ?? [],
            'opening_hours' => $w->opening_hours ?? [],
            'is_verified' => $w->is_verified,
            'distance_km' => isset($w->distance_km) ? round((float) $w->distance_km, 2) : null,
        ]);

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $workshops->currentPage(),
                'last_page' => $workshops->lastPage(),
                'per_page' => $workshops->perPage(),
                'total' => $workshops->total(),
            ],
            'search' => [
                'latitude' => $lat,
                'longitude' => $lng,
                'radius_km' => $radius,
            ],
        ]);
    }

    /**
     * Show a single workshop's public profile.
     *
     * GET /api/workshops/public/{id}
     */
    public function show(int $id): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;

        $workshop = Workshop::where('tenant_id', $tenantId)
            ->active()
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $workshop->id,
                'name' => $workshop->name,
                'description' => $workshop->description,
                'address' => $workshop->address,
                'city' => $workshop->city,
                'state' => $workshop->state,
                'postal_code' => $workshop->postal_code,
                'country' => $workshop->country,
                'latitude' => $workshop->latitude,
                'longitude' => $workshop->longitude,
                'phone' => $workshop->phone,
                'email' => $workshop->email,
                'website' => $workshop->website,
                'specializations' => $workshop->specializations ?? [],
                'opening_hours' => $workshop->opening_hours ?? [],
                'is_verified' => $workshop->is_verified,
            ],
        ]);
    }
}
