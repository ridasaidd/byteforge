<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MechanicProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * MechanicSearchController
 *
 * Public, unauthenticated API for searching mechanic workshop profiles by location.
 * Supports:
 *  - GPS-based search  (?lat=&lng=&radius=)
 *  - City/country text search  (?city=&country=)
 *  - Service filter  (?service=)
 *  - Pagination
 *
 * Distance is calculated server-side using the Haversine formula.
 * A bounding-box pre-filter keeps the trig operations to a minimum.
 */
class MechanicSearchController extends Controller
{
    /**
     * GET /api/mechanics/search
     *
     * Query params:
     *   lat      float  – user latitude  (required for distance sort)
     *   lng      float  – user longitude (required for distance sort)
     *   radius   float  – search radius in km (default 50, max 500)
     *   city     string – optional city filter
     *   country  string – optional country filter
     *   service  string – optional service filter (matches against services JSON array)
     *   verified bool   – when true, only return verified mechanics
     *   per_page int    – results per page (default 15, max 100)
     *   page     int    – page number (default 1)
     */
    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'lat'      => 'nullable|numeric|between:-90,90',
            'lng'      => 'nullable|numeric|between:-180,180',
            'radius'   => 'nullable|numeric|min:1|max:500',
            'city'     => 'nullable|string|max:100',
            'country'  => 'nullable|string|max:100',
            'service'  => 'nullable|string|max:100',
            'verified' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page'     => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid search parameters', 'errors' => $validator->errors()], 422);
        }

        $lat      = $request->filled('lat')  ? (float) $request->input('lat')  : null;
        $lng      = $request->filled('lng')  ? (float) $request->input('lng')  : null;
        $radiusKm = (float) ($request->input('radius', 50));
        $perPage  = (int)   ($request->input('per_page', 15));
        $page     = (int)   ($request->input('page', 1));

        // Build query
        $query = MechanicProfile::active()->with(['tenant', 'tenant.domains']);

        if ($request->boolean('verified')) {
            $query->verified();
        }

        if ($request->filled('city')) {
            $query->inCity($request->input('city'));
        }

        if ($request->filled('country')) {
            $query->inCountry($request->input('country'));
        }

        if ($request->filled('service')) {
            $query->offersService($request->input('service'));
        }

        // Bounding-box pre-filter when GPS coordinates are provided
        if ($lat !== null && $lng !== null) {
            $query->withCoordinates()->withinBoundingBox($lat, $lng, $radiusKm);
        }

        // Fetch all candidates for Haversine sorting (bounded by bounding box)
        $candidates = $query->get();

        // Haversine distance calculation & sorting
        if ($lat !== null && $lng !== null) {
            $candidates = $candidates
                ->map(function (MechanicProfile $profile) use ($lat, $lng) {
                    $profile->distance_km = $profile->distanceTo($lat, $lng);
                    return $profile;
                })
                ->filter(fn (MechanicProfile $p) => $p->distance_km !== null && $p->distance_km <= $radiusKm)
                ->sortBy('distance_km')
                ->values();
        }

        // Manual pagination
        $total   = $candidates->count();
        $offset  = ($page - 1) * $perPage;
        $items   = $candidates->slice($offset, $perPage)->values();

        $data = $items->map(fn (MechanicProfile $p) => $this->formatResult($p, $lat, $lng));

        return response()->json([
            'data' => $data,
            'meta' => [
                'total'        => $total,
                'per_page'     => $perPage,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / $perPage),
                'search'       => [
                    'lat'      => $lat,
                    'lng'      => $lng,
                    'radius'   => $lat !== null ? $radiusKm : null,
                    'city'     => $request->input('city'),
                    'country'  => $request->input('country'),
                    'service'  => $request->input('service'),
                ],
            ],
        ]);
    }

    /**
     * GET /api/mechanics/{id}
     * Return a single mechanic profile by ID (public).
     */
    public function show(int $id): JsonResponse
    {
        $profile = MechanicProfile::active()->with(['tenant', 'tenant.domains'])->find($id);

        if (! $profile) {
            return response()->json(['message' => 'Mechanic not found.'], 404);
        }

        return response()->json(['data' => $this->formatResult($profile, null, null)]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function formatResult(MechanicProfile $profile, ?float $lat, ?float $lng): array
    {
        $result = [
            'id'             => $profile->id,
            'tenant_id'      => $profile->tenant_id,
            'workshop_name'  => $profile->tenant?->name,
            'domain'         => $profile->tenant?->domains?->first()?->domain,
            'address'        => $profile->address,
            'city'           => $profile->city,
            'state'          => $profile->state,
            'country'        => $profile->country,
            'postal_code'    => $profile->postal_code,
            'latitude'       => $profile->latitude,
            'longitude'      => $profile->longitude,
            'phone'          => $profile->phone,
            'email'          => $profile->email,
            'website'        => $profile->website,
            'description'    => $profile->description,
            'services'       => $profile->services ?? [],
            'business_hours' => $profile->business_hours ?? [],
            'is_verified'    => $profile->is_verified,
        ];

        // Append distance when GPS search was performed
        if ($lat !== null && $lng !== null && isset($profile->distance_km)) {
            $result['distance_km'] = round($profile->distance_km, 2);
        }

        return $result;
    }
}
