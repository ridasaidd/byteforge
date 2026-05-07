<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MechanicProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * MechanicProfileController
 *
 * Manages the mechanic workshop profile for the authenticated tenant.
 * Each mechanic tenant has exactly one profile.
 * Routes are protected by tenant auth and membership middleware.
 */
class MechanicProfileController extends Controller
{
    /**
     * GET /api/mechanic-profile
     * Return the mechanic profile for the current tenant.
     */
    public function show(): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $profile  = MechanicProfile::where('tenant_id', $tenantId)->first();

        if (! $profile) {
            return response()->json(['data' => null], 200);
        }

        return response()->json(['data' => $this->formatProfile($profile)]);
    }

    /**
     * POST /api/mechanic-profile
     * Create the mechanic profile for the current tenant (if it does not exist).
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        if (MechanicProfile::where('tenant_id', $tenantId)->exists()) {
            return response()->json([
                'message' => 'A mechanic profile already exists for this tenant. Use PUT to update it.',
            ], 409);
        }

        $validator = $this->makeValidator($request);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $profile = MechanicProfile::create(array_merge(
            ['tenant_id' => $tenantId],
            $validator->validated()
        ));

        return response()->json(['data' => $this->formatProfile($profile)], 201);
    }

    /**
     * PUT /api/mechanic-profile
     * Create or replace the mechanic profile for the current tenant.
     */
    public function update(Request $request): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $validator = $this->makeValidator($request);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $profile = MechanicProfile::updateOrCreate(
            ['tenant_id' => $tenantId],
            $validator->validated()
        );

        return response()->json(['data' => $this->formatProfile($profile)]);
    }

    /**
     * DELETE /api/mechanic-profile
     * Remove the mechanic profile for the current tenant.
     */
    public function destroy(): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $profile  = MechanicProfile::where('tenant_id', $tenantId)->first();

        if (! $profile) {
            return response()->json(['message' => 'No mechanic profile found for this tenant.'], 404);
        }

        $profile->delete();

        return response()->json(['message' => 'Mechanic profile deleted successfully.']);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function makeValidator(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'address'        => 'nullable|string|max:255',
            'city'           => 'nullable|string|max:100',
            'state'          => 'nullable|string|max:100',
            'country'        => 'nullable|string|max:100',
            'postal_code'    => 'nullable|string|max:20',
            'latitude'       => 'nullable|numeric|between:-90,90',
            'longitude'      => 'nullable|numeric|between:-180,180',
            'phone'          => 'nullable|string|max:50',
            'email'          => 'nullable|email|max:255',
            'website'        => 'nullable|url|max:255',
            'description'    => 'nullable|string|max:5000',
            'services'       => 'nullable|array|max:50',
            'services.*'     => 'string|max:100',
            'business_hours' => 'nullable|array',
            'is_active'      => 'sometimes|boolean',
        ]);
    }

    private function formatProfile(MechanicProfile $profile): array
    {
        return [
            'id'             => $profile->id,
            'tenant_id'      => $profile->tenant_id,
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
            'is_active'      => $profile->is_active,
            'is_verified'    => $profile->is_verified,
            'created_at'     => $profile->created_at?->toISOString(),
            'updated_at'     => $profile->updated_at?->toISOString(),
        ];
    }
}
