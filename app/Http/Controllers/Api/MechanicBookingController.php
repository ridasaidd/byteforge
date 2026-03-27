<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MechanicBooking;
use App\Models\MechanicWorkshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MechanicBookingController extends Controller
{
    /**
     * List bookings for a workshop (workshop_owner or admin).
     */
    public function index(Request $request, int $workshopId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        if (! $user->hasRole('admin') && (int) $workshop->owner_user_id !== $user->id) {
            abort(403, 'You do not have permission to view bookings for this workshop.');
        }

        $validated = $request->validate([
            'status'   => ['nullable', 'in:pending,confirmed,cancelled,completed'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $workshop->bookings()
            ->with(['service:id,name', 'customer:id,name,email'])
            ->latest('scheduled_at');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $bookings = $query->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'data' => $bookings->items(),
            'meta' => [
                'current_page' => $bookings->currentPage(),
                'last_page'    => $bookings->lastPage(),
                'per_page'     => $bookings->perPage(),
                'total'        => $bookings->total(),
            ],
        ]);
    }

    /**
     * List the authenticated customer's own bookings.
     */
    public function myBookings(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'status'   => ['nullable', 'in:pending,confirmed,cancelled,completed'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = MechanicBooking::forCustomer($user->id)
            ->with(['workshop:id,name,address,city', 'service:id,name'])
            ->latest('scheduled_at');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $bookings = $query->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'data' => $bookings->items(),
            'meta' => [
                'current_page' => $bookings->currentPage(),
                'last_page'    => $bookings->lastPage(),
                'per_page'     => $bookings->perPage(),
                'total'        => $bookings->total(),
            ],
        ]);
    }

    /**
     * Create a booking (authenticated customers).
     */
    public function store(Request $request, int $workshopId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->active()->findOrFail($workshopId);

        $validated = $request->validate([
            'service_id'   => ['nullable', 'integer', 'exists:mechanic_services,id'],
            'scheduled_at' => ['required', 'date', 'after:+1 hour'],
            'notes'        => ['nullable', 'string', 'max:2000'],
        ]);

        // Ensure the service belongs to this workshop when provided
        if (! empty($validated['service_id'])) {
            $workshop->services()->findOrFail((int) $validated['service_id']);
        }

        $booking = MechanicBooking::create([
            'workshop_id'       => $workshop->id,
            'service_id'        => $validated['service_id'] ?? null,
            'customer_user_id'  => $user->id,
            'scheduled_at'      => $validated['scheduled_at'],
            'notes'             => $validated['notes'] ?? null,
            'status'            => 'pending',
        ]);

        return response()->json([
            'data' => $booking->load(['workshop:id,name', 'service:id,name']),
        ], 201);
    }

    /**
     * Update a booking status (workshop_owner or admin confirms / cancels).
     */
    public function update(Request $request, int $workshopId, int $bookingId): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $user = $request->user();

        $workshop = MechanicWorkshop::forTenant($tenantId)->findOrFail($workshopId);

        if (! $user->hasRole('admin') && (int) $workshop->owner_user_id !== $user->id) {
            abort(403, 'You do not have permission to manage bookings for this workshop.');
        }

        $booking = MechanicBooking::forWorkshop($workshop->id)->findOrFail($bookingId);

        $validated = $request->validate([
            'status'              => ['required', 'in:pending,confirmed,cancelled,completed'],
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking->update($validated);

        return response()->json(['data' => $booking->fresh()]);
    }

    /**
     * Cancel a booking (the customer who owns it).
     */
    public function cancel(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        $booking = MechanicBooking::forCustomer($user->id)->findOrFail($bookingId);

        if (! in_array($booking->status, ['pending', 'confirmed'], true)) {
            abort(422, 'Only pending or confirmed bookings can be cancelled.');
        }

        $validated = $request->validate([
            'cancellation_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $validated['cancellation_reason'] ?? null,
        ]);

        return response()->json(['data' => $booking->fresh()]);
    }
}
