<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingResource;
use App\Models\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingServiceController extends Controller
{
    public function index(): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $rows = BookingService::forTenant($tenantId)
            ->with('resources:id,name,type')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateServicePayload($request);

        $service = BookingService::create(array_merge(
            $validated,
            ['tenant_id' => (string) tenant('id')],
        ));

        return response()->json(['data' => $service], 201);
    }

    public function show(int $id): JsonResponse
    {
        $service = $this->resolveService($id);
        $service->load('resources:id,name,type');

        return response()->json(['data' => $service]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $service   = $this->resolveService($id);
        $validated = $this->validateServicePayload($request, partial: true);

        $service->update($validated);

        return response()->json(['data' => $service->fresh()->load('resources:id,name,type')]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->resolveService($id)->delete();

        return response()->json(null, 204);
    }

    // ─── Resource ↔ Service links ─────────────────────────────────────────────

    public function attachResource(Request $request, int $id): JsonResponse
    {
        $service = $this->resolveService($id);

        $validated = Validator::make($request->all(), [
            'resource_id' => ['required', 'integer', 'exists:booking_resources,id'],
        ])->validate();

        $resource = BookingResource::forTenant((string) tenant('id'))
            ->findOrFail((int) $validated['resource_id']);

        $service->resources()->syncWithoutDetaching([$resource->id]);

        return response()->json(['data' => $service->load('resources:id,name,type')]);
    }

    public function detachResource(int $id, int $resourceId): JsonResponse
    {
        $service = $this->resolveService($id);

        BookingResource::forTenant((string) tenant('id'))->findOrFail($resourceId);

        $service->resources()->detach($resourceId);

        return response()->json(null, 204);
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private function validateServicePayload(Request $request, bool $partial = false): array
    {
        $rules = [
            'name'                  => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'description'           => ['nullable', 'string'],
            'booking_mode'          => [$partial ? 'sometimes' : 'required', 'string', 'in:slot,range'],
            'duration_minutes'      => ['nullable', 'integer', 'min:1'],
            'slot_interval_minutes' => ['nullable', 'integer', 'min:1'],
            'min_nights'            => ['nullable', 'integer', 'min:1'],
            'max_nights'            => ['nullable', 'integer', 'min:1'],
            'buffer_minutes'        => ['sometimes', 'integer', 'min:0'],
            'advance_notice_hours'  => ['sometimes', 'integer', 'min:0'],
            'max_advance_days'      => ['nullable', 'integer', 'min:1'],
            'price'                 => ['nullable', 'numeric', 'min:0'],
            'currency'              => ['sometimes', 'string', 'size:3'],
            'is_active'             => ['sometimes', 'boolean'],
        ];

        return Validator::make($request->all(), $rules)->validate();
    }

    private function resolveService(int $id): BookingService
    {
        return BookingService::forTenant((string) tenant('id'))->findOrFail($id);
    }
}
