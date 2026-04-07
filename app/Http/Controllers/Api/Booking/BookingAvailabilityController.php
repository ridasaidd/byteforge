<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingAvailabilityController extends Controller
{
    public function index(int $resourceId): JsonResponse
    {
        $resource = $this->resolveResource($resourceId);

        $windows = BookingAvailability::where('resource_id', $resource->id)
            ->orderBy('day_of_week')
            ->orderBy('specific_date')
            ->get();

        return response()->json(['data' => $windows]);
    }

    public function store(Request $request, int $resourceId): JsonResponse
    {
        $resource = $this->resolveResource($resourceId);

        $validated = Validator::make($request->all(), [
            'day_of_week'   => ['nullable', 'integer', 'min:0', 'max:6'],
            'specific_date' => ['nullable', 'date_format:Y-m-d'],
            'starts_at'     => ['required', 'date_format:H:i:s'],
            'ends_at'       => ['required', 'date_format:H:i:s', 'after:starts_at'],
            'is_blocked'    => ['sometimes', 'boolean'],
        ])->validate();

        $window = BookingAvailability::create([
            'resource_id'   => $resource->id,
            'day_of_week'   => $validated['day_of_week'] ?? null,
            'specific_date' => $validated['specific_date'] ?? null,
            'starts_at'     => $validated['starts_at'],
            'ends_at'       => $validated['ends_at'],
            'is_blocked'    => $validated['is_blocked'] ?? false,
        ]);

        return response()->json(['data' => $window], 201);
    }

    public function update(Request $request, int $windowId): JsonResponse
    {
        $window = $this->resolveWindow($windowId);

        $validated = Validator::make($request->all(), [
            'day_of_week'   => ['nullable', 'integer', 'min:0', 'max:6'],
            'specific_date' => ['nullable', 'date_format:Y-m-d'],
            'starts_at'     => ['sometimes', 'date_format:H:i:s'],
            'ends_at'       => ['sometimes', 'date_format:H:i:s', 'after:starts_at'],
            'is_blocked'    => ['sometimes', 'boolean'],
        ])->validate();

        $window->update($validated);

        return response()->json(['data' => $window->fresh()]);
    }

    public function destroy(int $windowId): JsonResponse
    {
        $this->resolveWindow($windowId)->delete();

        return response()->json(null, 204);
    }

    private function resolveResource(int $id): BookingResource
    {
        return BookingResource::forTenant((string) tenant('id'))->findOrFail($id);
    }

    private function resolveWindow(int $id): BookingAvailability
    {
        $window = BookingAvailability::findOrFail($id);

        // Ensure the window belongs to a resource owned by this tenant
        BookingResource::forTenant((string) tenant('id'))->findOrFail($window->resource_id);

        return $window;
    }
}
