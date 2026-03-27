<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MechanicReview;
use App\Models\MechanicWorkshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MechanicReviewController extends Controller
{
    /**
     * List published reviews for a workshop (public).
     */
    public function index(int $workshopId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        $reviews = $workshop->reviews()
            ->published()
            ->with('reviewer:id,name')
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $reviews->items(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page'    => $reviews->lastPage(),
                'per_page'     => $reviews->perPage(),
                'total'        => $reviews->total(),
            ],
        ]);
    }

    /**
     * Submit a review (authenticated customers).
     */
    public function store(Request $request, int $workshopId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->active()->findOrFail($workshopId);

        // One review per user per workshop (enforced at DB level too)
        if ($workshop->reviews()->where('reviewer_user_id', $user->id)->exists()) {
            abort(422, 'You have already submitted a review for this workshop.');
        }

        $validated = $request->validate([
            'rating'  => ['required', 'integer', 'min:1', 'max:5'],
            'title'   => ['nullable', 'string', 'max:255'],
            'comment' => ['nullable', 'string', 'max:3000'],
        ]);

        $validated['workshop_id'] = $workshop->id;
        $validated['reviewer_user_id'] = $user->id;

        $review = MechanicReview::create($validated);

        // Keep aggregate rating in sync
        $workshop->recalculateRating();

        return response()->json(['data' => $review->load('reviewer:id,name')], 201);
    }

    /**
     * Moderate a review (admin only): approve or reject.
     */
    public function update(Request $request, int $workshopId, int $reviewId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);
        $review = MechanicReview::where('workshop_id', $workshop->id)->findOrFail($reviewId);

        $validated = $request->validate([
            'status' => ['required', 'in:published,pending,rejected'],
        ]);

        $review->update($validated);

        // Rating may change when moderation status changes
        $workshop->recalculateRating();

        return response()->json(['data' => $review->fresh()]);
    }

    /**
     * Delete a review (admin only).
     */
    public function destroy(Request $request, int $workshopId, int $reviewId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);
        $review = MechanicReview::where('workshop_id', $workshop->id)->findOrFail($reviewId);

        $review->delete();
        $workshop->recalculateRating();

        return response()->json(['message' => 'Review deleted.']);
    }
}
