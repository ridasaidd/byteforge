<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\BookingResourceBlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BookingResourceBlockController extends Controller
{
    public function index(int $resourceId): JsonResponse
    {
        $resource = $this->resolveResource($resourceId);

        $blocks = BookingResourceBlock::where('resource_id', $resource->id)
            ->with('creator:id,name,email')
            ->orderBy('start_date')
            ->get();

        return response()->json(['data' => $blocks]);
    }

    public function store(Request $request, int $resourceId): JsonResponse
    {
        $resource = $this->resolveResource($resourceId);

        $validated = Validator::make($request->all(), [
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date'   => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'reason'     => ['nullable', 'string', 'max:120'],
        ])->validate();

        // Warn about confirmed bookings in the range (non-blocking)
        $conflictCount = Booking::where('resource_id', $resource->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereDate('starts_at', '<=', $validated['end_date'])
            ->whereDate('ends_at', '>=', $validated['start_date'])
            ->count();

        $block = BookingResourceBlock::create([
            'resource_id' => $resource->id,
            'start_date'  => $validated['start_date'],
            'end_date'    => $validated['end_date'],
            'reason'      => $validated['reason'] ?? null,
            'created_by'  => Auth::id(),
        ]);

        $response = ['data' => $block->load('creator:id,name,email')];

        if ($conflictCount > 0) {
            $response['warning'] = "{$conflictCount} confirmed booking(s) exist in this date range. Handle them manually.";
        }

        return response()->json($response, 201);
    }

    public function destroy(int $resourceId, int $blockId): JsonResponse
    {
        $this->resolveResource($resourceId);

        $block = BookingResourceBlock::findOrFail($blockId);

        abort_unless((int) $block->resource_id === $resourceId, 404);

        $block->delete();

        return response()->json(null, 204);
    }

    private function resolveResource(int $id): BookingResource
    {
        return BookingResource::forTenant((string) tenant('id'))->findOrFail($id);
    }
}
