<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkshopProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manages the workshop profile for the currently initialised tenant.
 *
 * Routes are registered in routes/tenant.php and are therefore only reachable
 * on a tenant subdomain (not on the central domain).
 */
class WorkshopProfileController extends Controller
{
    /**
     * Allowed specialization slugs – validated on write, returned for the UI on GET.
     */
    public const SPECIALIZATIONS = [
        'engine_repair',
        'brakes',
        'tires',
        'bodywork',
        'electrical',
        'ac_service',
        'oil_change',
        'transmission',
        'suspension',
        'exhaust',
        'diagnostics',
        'inspection',
        'windscreen',
        'detailing',
        'other',
    ];

    // -------------------------------------------------------------------------
    // Profile management
    // -------------------------------------------------------------------------

    /**
     * GET /api/workshop-profile
     *
     * Return the workshop profile for the current tenant.
     * Returns 404 JSON when no profile has been created yet.
     */
    public function show(): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        $profile = WorkshopProfile::where('tenant_id', $tenantId)->first();

        if (! $profile) {
            return response()->json(['message' => 'No workshop profile found.'], 404);
        }

        return response()->json($profile);
    }

    /**
     * PUT /api/workshop-profile
     *
     * Create or update the workshop profile for the current tenant.
     * Uses upsert semantics so the caller never has to distinguish
     * between create and update.
     */
    public function upsert(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTenantId();

        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:5000',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|size:2',
            'postal_code' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'specializations' => 'nullable|array',
            'specializations.*' => 'string|in:'.implode(',', self::SPECIALIZATIONS),
            'opening_hours' => 'nullable|array',
            'is_listed' => 'boolean',
        ]);

        $validated['tenant_id'] = $tenantId;

        $profile = WorkshopProfile::updateOrCreate(
            ['tenant_id' => $tenantId],
            $validated
        );

        $statusCode = $profile->wasRecentlyCreated ? 201 : 200;

        return response()->json($profile, $statusCode);
    }

    /**
     * DELETE /api/workshop-profile
     *
     * Remove the workshop profile (de-lists from the directory).
     */
    public function destroy(): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        $profile = WorkshopProfile::where('tenant_id', $tenantId)->first();

        if (! $profile) {
            return response()->json(['message' => 'No workshop profile found.'], 404);
        }

        $profile->delete();

        return response()->json(['message' => 'Workshop profile deleted.']);
    }

    // -------------------------------------------------------------------------
    // Review management (tenant-side: read-only view of received reviews)
    // -------------------------------------------------------------------------

    /**
     * GET /api/workshop-profile/reviews
     *
     * List reviews received by this tenant's workshop.
     */
    public function reviews(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTenantId();
        $profile = WorkshopProfile::where('tenant_id', $tenantId)->first();

        if (! $profile) {
            return response()->json(['message' => 'No workshop profile found.'], 404);
        }

        $reviews = $profile->reviews()
            ->with('reviewer:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($reviews);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Return the current tenant ID or abort with 400.
     */
    private function resolveTenantId(): string
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(400, 'Tenant context required.');
        }

        return (string) tenancy()->tenant->id;
    }

    /**
     * GET /api/workshop-profile/specializations
     *
     * Return the list of allowed specialization slugs so front-ends
     * can build selection UI without hard-coding them.
     */
    public function specializations(): JsonResponse
    {
        return response()->json(['specializations' => self::SPECIALIZATIONS]);
    }
}
