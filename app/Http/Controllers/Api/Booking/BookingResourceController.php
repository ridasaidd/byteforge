<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingResourceController extends Controller
{
    public function index(): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $rows = BookingResource::forTenant($tenantId)
            ->with(['services:id,name,booking_mode', 'user:id,name,email'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'name'           => ['required', 'string', 'max:120'],
            'type'           => ['required', 'string', 'in:person,space,equipment'],
            'description'    => ['nullable', 'string', 'max:1000'],
            'checkin_time'   => ['nullable', 'string', 'date_format:H:i,H:i:s'],
            'checkout_time'  => ['nullable', 'string', 'date_format:H:i,H:i:s'],
            'capacity'       => ['sometimes', 'integer', 'min:1', 'max:255'],
            'resource_label' => ['nullable', 'string', 'max:60'],
            'user_id'        => ['nullable', 'integer', 'exists:users,id'],
            'is_active'      => ['sometimes', 'boolean'],
        ])->validate();

        $validated = $this->normalizePersonFields($validated);

        $resource = BookingResource::create([
            'tenant_id'      => (string) tenant('id'),
            'name'           => $validated['name'],
            'type'           => $validated['type'],
            'description'    => $validated['description'] ?? null,
            'checkin_time'   => $validated['checkin_time'] ?? null,
            'checkout_time'  => $validated['checkout_time'] ?? null,
            'capacity'       => $validated['capacity'] ?? 1,
            'resource_label' => $validated['resource_label'] ?? null,
            'user_id'        => $validated['user_id'] ?? null,
            'is_active'      => $validated['is_active'] ?? true,
        ]);

        return response()->json(['data' => $resource], 201);
    }

    public function show(int $id): JsonResponse
    {
        $resource = $this->resolveResource($id);

        $resource->load(['services:id,name,booking_mode', 'user:id,name,email', 'availabilities', 'blocks']);

        return response()->json(['data' => $resource]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $resource = $this->resolveResource($id);

        $validated = Validator::make($request->all(), [
            'name'           => ['sometimes', 'string', 'max:120'],
            'type'           => ['sometimes', 'string', 'in:person,space,equipment'],
            'description'    => ['nullable', 'string', 'max:1000'],
            'checkin_time'   => ['nullable', 'string', 'date_format:H:i,H:i:s'],
            'checkout_time'  => ['nullable', 'string', 'date_format:H:i,H:i:s'],
            'capacity'       => ['sometimes', 'integer', 'min:1', 'max:255'],
            'resource_label' => ['nullable', 'string', 'max:60'],
            'user_id'        => ['nullable', 'integer', 'exists:users,id'],
            'is_active'      => ['sometimes', 'boolean'],
        ])->validate();

        $effectiveType = $validated['type'] ?? $resource->type;
        $validated = $this->normalizePersonFields($validated, $effectiveType);

        $resource->update($validated);

        return response()->json(['data' => $resource->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $resource = $this->resolveResource($id);
        $resource->delete();

        return response()->json(null, 204);
    }

    private function resolveResource(int $id): BookingResource
    {
        return BookingResource::forTenant((string) tenant('id'))->findOrFail($id);
    }

    /**
     * Enforce person resource invariants regardless of client payload.
     * A staff member can only serve one customer at a time and uses `name` as identifier.
     *
     * @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function normalizePersonFields(array $validated, ?string $type = null): array
    {
        $effectiveType = $type ?? ($validated['type'] ?? null);

        if ($effectiveType === BookingResource::TYPE_PERSON) {
            $validated['capacity'] = 1;
            $validated['resource_label'] = null;
            $validated['checkin_time'] = null;
            $validated['checkout_time'] = null;
        }

        return $validated;
    }
}
