<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MechanicService;
use App\Models\MechanicWorkshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MechanicServiceController extends Controller
{
    /**
     * List services for a workshop (public).
     */
    public function index(int $workshopId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        $services = $workshop->services()
            ->active()
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $services]);
    }

    /**
     * Add a service to a workshop (workshop_owner or admin).
     */
    public function store(Request $request, int $workshopId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        if (! $user->hasRole('admin') && (int) $workshop->owner_user_id !== $user->id) {
            abort(403, 'You do not have permission to manage services for this workshop.');
        }

        $validated = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string', 'max:2000'],
            'price_min'        => ['nullable', 'integer', 'min:0'],
            'price_max'        => ['nullable', 'integer', 'min:0', 'gte:price_min'],
            'currency'         => ['nullable', 'string', 'size:3'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'is_active'        => ['nullable', 'boolean'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['workshop_id'] = $workshop->id;

        $service = MechanicService::create($validated);

        return response()->json(['data' => $service], 201);
    }

    /**
     * Update a service (workshop_owner or admin).
     */
    public function update(Request $request, int $workshopId, int $serviceId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        if (! $user->hasRole('admin') && (int) $workshop->owner_user_id !== $user->id) {
            abort(403, 'You do not have permission to manage services for this workshop.');
        }

        $service = MechanicService::where('workshop_id', $workshop->id)->findOrFail($serviceId);

        $validated = $request->validate([
            'name'             => ['sometimes', 'string', 'max:255'],
            'description'      => ['nullable', 'string', 'max:2000'],
            'price_min'        => ['nullable', 'integer', 'min:0'],
            'price_max'        => ['nullable', 'integer', 'min:0'],
            'currency'         => ['nullable', 'string', 'size:3'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'is_active'        => ['nullable', 'boolean'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
        ]);

        // Ensure price_max >= price_min considering existing stored values
        $effectivePriceMin = $validated['price_min'] ?? $service->price_min;
        $effectivePriceMax = $validated['price_max'] ?? $service->price_max;
        if ($effectivePriceMin !== null && $effectivePriceMax !== null && $effectivePriceMax < $effectivePriceMin) {
            return response()->json([
                'message' => 'The price_max field must be greater than or equal to price_min.',
                'errors'  => ['price_max' => ['The price_max must be greater than or equal to price_min.']],
            ], 422);
        }

        $service->update($validated);

        return response()->json(['data' => $service->fresh()]);
    }

    /**
     * Delete a service (workshop_owner or admin).
     */
    public function destroy(Request $request, int $workshopId, int $serviceId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        if (! $user->hasRole('admin') && (int) $workshop->owner_user_id !== $user->id) {
            abort(403, 'You do not have permission to manage services for this workshop.');
        }

        MechanicService::where('workshop_id', $workshop->id)->findOrFail($serviceId)->delete();

        return response()->json(['message' => 'Service deleted.']);
    }
}
