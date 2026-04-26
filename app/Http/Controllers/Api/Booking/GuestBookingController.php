<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\GuestUser;
use App\Notifications\Booking\BookingCancelledByCustomerNotification;
use App\Services\BookingPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestBookingController extends Controller
{
    public function __construct(
        private readonly BookingPaymentService $bookingPayment,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $guestUser = $this->authenticatedGuest($request);

        $bookings = Booking::forTenant($this->currentTenantId())
            ->forGuest($guestUser->id)
            ->with(['service:id,name,booking_mode', 'resource:id,name,type'])
            ->orderBy('starts_at')
            ->get();

        return response()->json([
            'data' => $bookings->map(fn (Booking $booking) => $this->bookingPayload($booking))->all(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $booking = $this->resolveGuestBooking($request, $id);
        $booking->load(['service:id,name,booking_mode', 'resource:id,name,type']);

        return response()->json([
            'data' => $this->bookingPayload($booking),
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $booking = $this->resolveGuestBooking($request, $id);

        if (! in_array($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED], true)) {
            return response()->json([
                'message' => 'This booking cannot be cancelled in its current status.',
            ], 422);
        }

        $fromStatus = $booking->status;

        if ($booking->payment_id) {
            $refundSucceeded = $this->bookingPayment->refundBookingIfPaid(
                $booking,
                'Cancelled by authenticated guest'
            );

            if (! $refundSucceeded) {
                return response()->json([
                    'message' => 'Refund processing failed. Please contact support to process your refund manually.',
                ], 422);
            }
        }

        $booking->update([
            'status' => Booking::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => Booking::CANCELLED_BY_CUSTOMER,
        ]);

        $booking->recordEvent(
            toStatus: Booking::STATUS_CANCELLED,
            actorType: Booking::ACTOR_CUSTOMER,
            fromStatus: $fromStatus,
            note: 'Cancelled by authenticated guest',
        );

        $booking->load(['service:id,name,booking_mode', 'resource:id,name,type']);

        \Illuminate\Support\Facades\Notification::route('mail', [$booking->customer_email => $booking->customer_name])
            ->notify(new BookingCancelledByCustomerNotification($booking, $this->tenantDomain()));

        return response()->json([
            'data' => $this->bookingPayload($booking),
        ]);
    }

    private function resolveGuestBooking(Request $request, int $id): Booking
    {
        $guestUser = $this->authenticatedGuest($request);

        return Booking::forTenant($this->currentTenantId())
            ->forGuest($guestUser->id)
            ->findOrFail($id);
    }

    private function authenticatedGuest(Request $request): GuestUser
    {
        $guestUser = $request->attributes->get('guest_user');

        if (! $guestUser instanceof GuestUser) {
            abort(401, 'Unauthenticated.');
        }

        return $guestUser;
    }

    private function currentTenantId(): string
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        return (string) tenancy()->tenant->id;
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingPayload(Booking $booking): array
    {
        return [
            'id' => $booking->id,
            'status' => $booking->status,
            'customer_name' => $booking->customer_name,
            'customer_email' => $booking->customer_email,
            'customer_phone' => $booking->customer_phone,
            'customer_notes' => $booking->customer_notes,
            'starts_at' => $booking->starts_at?->toIso8601String(),
            'ends_at' => $booking->ends_at?->toIso8601String(),
            'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
            'can_cancel' => in_array($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED], true),
            'service' => $booking->service ? [
                'id' => $booking->service->id,
                'name' => $booking->service->name,
                'booking_mode' => $booking->service->booking_mode,
            ] : null,
            'resource' => $booking->resource ? [
                'id' => $booking->resource->id,
                'name' => $booking->resource->name,
                'type' => $booking->resource->type,
            ] : null,
            'payment' => $booking->payment ? [
                'id' => $booking->payment->id,
                'status' => $booking->payment->status,
                'amount' => $booking->payment->amount,
                'currency' => $booking->payment->currency,
            ] : null,
        ];
    }

    private function tenantDomain(): string
    {
        /** @var \App\Models\Tenant $tenant */
        $tenant = tenancy()->tenant;

        return $tenant->domains()->first()?->domain
            ?? "{$tenant->slug}.byteforge.se";
    }
}
