<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkshopProfile;
use App\Models\WorkshopReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Public / customer-facing workshop discovery and review endpoints.
 *
 * These routes live on the central domain (routes/api.php) so that
 * customers can search across all mechanic tenants from a single URL,
 * regardless of which tenant subdomain they are on.
 *
 * No tenant initialisation is required here – all data is read from
 * the central database using explicit tenant_id columns.
 */
class WorkshopSearchController extends Controller
{
    /**
     * GET /api/workshops/search
     *
     * Location-based workshop search using the Haversine formula.
     *
     * Query parameters
     * ----------------
     * lat         float    required   Searcher latitude  (decimal degrees, –90 to 90)
     * lng         float    required   Searcher longitude (decimal degrees, –180 to 180)
     * radius_km   float    optional   Search radius in km (default 50, max 500)
     * specialty   string   optional   Filter by specialization slug
     * q           string   optional   Full-text search on display_name / city / description
     * per_page    int      optional   Results per page (default 20, max 100)
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius_km' => 'nullable|numeric|min:0.1|max:500',
            'specialty' => 'nullable|string|max:100',
            'q' => 'nullable|string|max:200',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $lat = (float) $request->input('lat');
        $lng = (float) $request->input('lng');
        $radiusKm = (float) ($request->input('radius_km', 50));
        $perPage = $request->integer('per_page', 20);

        $query = WorkshopProfile::listed()
            ->nearby($lat, $lng, $radiusKm);

        if ($request->filled('specialty')) {
            $query->hasSpecialization($request->input('specialty'));
        }

        if ($request->filled('q')) {
            $term = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $request->input('q'));
            $query->where(function ($q) use ($term) {
                $q->where('display_name', 'like', "%{$term}%")
                    ->orWhere('city', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            });
        }

        $workshops = $query->paginate($perPage);

        return response()->json($workshops);
    }

    /**
     * GET /api/workshops/{tenantId}
     *
     * Return a single workshop's public profile.
     */
    public function show(string $tenantId): JsonResponse
    {
        $profile = WorkshopProfile::where('tenant_id', $tenantId)
            ->where('is_listed', true)
            ->firstOrFail();

        return response()->json($profile);
    }

    // -------------------------------------------------------------------------
    // Reviews (customer-facing)
    // -------------------------------------------------------------------------

    /**
     * GET /api/workshops/{tenantId}/reviews
     *
     * List public reviews for a workshop.
     */
    public function listReviews(Request $request, string $tenantId): JsonResponse
    {
        $profile = WorkshopProfile::where('tenant_id', $tenantId)
            ->where('is_listed', true)
            ->firstOrFail();

        $reviews = $profile->reviews()
            ->with('reviewer:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($reviews);
    }

    /**
     * POST /api/workshops/{tenantId}/reviews
     *
     * Submit a review for a workshop.
     * Requires authentication (auth:api); one review per user per workshop.
     */
    public function storeReview(Request $request, string $tenantId): JsonResponse
    {
        $profile = WorkshopProfile::where('tenant_id', $tenantId)
            ->where('is_listed', true)
            ->firstOrFail();

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $userId = Auth::id();

        // Enforce one-review-per-user constraint
        $existing = WorkshopReview::where('workshop_profile_id', $profile->id)
            ->where('reviewer_user_id', $userId)
            ->exists();

        if ($existing) {
            return response()->json([
                'message' => 'You have already reviewed this workshop.',
            ], 422);
        }

        $review = WorkshopReview::create([
            'workshop_profile_id' => $profile->id,
            'reviewer_user_id' => $userId,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json($review->load('reviewer:id,name'), 201);
    }

    /**
     * DELETE /api/workshops/{tenantId}/reviews/{reviewId}
     *
     * Allow the original reviewer to delete their own review.
     */
    public function destroyReview(string $tenantId, int $reviewId): JsonResponse
    {
        $profile = WorkshopProfile::where('tenant_id', $tenantId)->firstOrFail();

        $review = WorkshopReview::where('id', $reviewId)
            ->where('workshop_profile_id', $profile->id)
            ->where('reviewer_user_id', Auth::id())
            ->firstOrFail();

        $review->delete();

        return response()->json(['message' => 'Review deleted.']);
    }
}
