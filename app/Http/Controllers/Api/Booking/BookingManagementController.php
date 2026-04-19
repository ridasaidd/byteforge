<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Actions\Api\SanitizeBookingCustomerInputAction;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Tenant;
use App\Notifications\Booking\BookingCancelledByTenantNotification;
use App\Notifications\Booking\BookingConfirmedNotification;
use App\Notifications\Booking\BookingRescheduledNotification;
use App\Notifications\Booking\StaffBookingAssignedNotification;
use App\Services\BookingAvailabilityService;
use App\Services\BookingPaymentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;

class BookingManagementController extends Controller
{
    public function __construct(
        private readonly BookingAvailabilityService $availability,
        private readonly BookingPaymentService $bookingPayment,
        private readonly SanitizeBookingCustomerInputAction $sanitizeBookingCustomerInput,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Booking::forTenant((string) tenant('id'))
            ->with(['service:id,name,booking_mode', 'resource:id,name,type']);

        if ($request->filled('date')) {
            $date = Carbon::parse($request->input('date'));
            $query->whereDate('starts_at', $date);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('resource_id')) {
            $query->where('resource_id', (int) $request->input('resource_id'));
        }

        if ($request->filled('service_id')) {
            $query->where('service_id', (int) $request->input('service_id'));
        }

        $results = $query->orderBy('starts_at')->paginate(50);

        return response()->json($results);
    }

    public function show(int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);
        $booking->load([
            'service:id,name,booking_mode',
            'resource:id,name,type',
            'events',
            'notifications',
        ]);

        return response()->json(['data' => $booking]);
    }

    public function confirm(int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);

        if (!in_array($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_PENDING_HOLD], true)) {
            return response()->json([
                'message' => 'Only pending or pending-hold bookings can be confirmed.',
            ], 422);
        }

        $from = $booking->status;

        $booking->update(['status' => Booking::STATUS_CONFIRMED]);
        $booking->recordEvent(
            Booking::STATUS_CONFIRMED,
            Booking::ACTOR_TENANT_USER,
            Auth::id(),
            $from,
        );

        $domain = $this->tenantDomain();
        $booking->load('resource');
        Notification::route('mail', [$booking->customer_email => $booking->customer_name])
            ->notify(new BookingConfirmedNotification($booking, $domain));

        // Notify the assigned staff member if the resource is a person with an email.
        $resource = $booking->resource;
        if ($resource && $resource->type === BookingResource::TYPE_PERSON && $resource->user_id) {
            $staffUser = \App\Models\User::find($resource->user_id);
            if ($staffUser) {
                $staffUser->notify(new StaffBookingAssignedNotification($booking, $domain, $resource));
            }
        }

        return response()->json(['data' => $booking->fresh()]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);

        $allowedStatuses = [
            Booking::STATUS_PENDING_HOLD,
            Booking::STATUS_PENDING,
            Booking::STATUS_CONFIRMED,
        ];

        if (! in_array($booking->status, $allowedStatuses, true)) {
            return response()->json([
                'message' => 'This booking cannot be cancelled.',
            ], 422);
        }

        $validated = Validator::make($request->all(), [
            'note' => ['nullable', 'string', 'max:500'],
        ])->validate();

        // Phase 14: Process refund if booking has an associated payment
        if ($booking->payment_id) {
            $refundSucceeded = $this->bookingPayment->refundBookingIfPaid(
                $booking,
                $validated['note'] ?? 'Cancelled by tenant'
            );

            if (!$refundSucceeded) {
                return response()->json(
                    [
                        'message' => 'Refund processing failed. Please try again or contact support.',
                    ],
                    422,
                );
            }
        }

        $from = $booking->status;

        $booking->update([
            'status'       => Booking::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => Booking::CANCELLED_BY_TENANT,
        ]);

        $booking->recordEvent(
            Booking::STATUS_CANCELLED,
            Booking::ACTOR_TENANT_USER,
            Auth::id(),
            $from,
            $validated['note'] ?? null,
        );

        $domain = $this->tenantDomain();
        Notification::route('mail', [$booking->customer_email => $booking->customer_name])
            ->notify(new BookingCancelledByTenantNotification($booking, $domain));

        return response()->json(['data' => $booking->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);

        $deletableStatuses = [
            Booking::STATUS_CANCELLED,
            Booking::STATUS_COMPLETED,
            Booking::STATUS_NO_SHOW,
        ];

        if (! in_array($booking->status, $deletableStatuses, true)) {
            return response()->json([
                'message' => 'Only cancelled, completed, or no-show bookings can be deleted.',
            ], 422);
        }

        $booking->forceDelete();

        return response()->json(null, 204);
    }

    public function reschedule(Request $request, int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);

        $allowedStatuses = [
            Booking::STATUS_PENDING,
            Booking::STATUS_CONFIRMED,
        ];

        if (! in_array($booking->status, $allowedStatuses, true)) {
            return response()->json([
                'message' => 'This booking cannot be rescheduled.',
            ], 422);
        }

        $validated = Validator::make($request->all(), [
            'starts_at' => ['required', 'date'],
            'ends_at'   => ['required', 'date', 'after:starts_at'],
        ])->validate();

        $service  = BookingService::findOrFail($booking->service_id);
        $resource = BookingResource::findOrFail($booking->resource_id);
        $startsAt = Carbon::parse($validated['starts_at']);
        $endsAt   = Carbon::parse($validated['ends_at']);

        $isAvailable = $this->availability->isRangeAvailable(
            $service,
            $resource,
            $startsAt,
            $endsAt,
        );

        if (! $isAvailable) {
            return response()->json([
                'message' => 'The requested time slot is not available.',
            ], 409);
        }

        $from = $booking->status;

        $booking->update([
            'starts_at' => $startsAt,
            'ends_at'   => $endsAt,
        ]);

        $booking->recordEvent(
            $booking->status,
            Booking::ACTOR_TENANT_USER,
            Auth::id(),
            $from,
            "Rescheduled to {$startsAt->toDateTimeString()} – {$endsAt->toDateTimeString()}",
        );

        $domain = $this->tenantDomain();
        Notification::route('mail', [$booking->customer_email => $booking->customer_name])
            ->notify(new BookingRescheduledNotification($booking, $domain, 'tenant'));

        return response()->json(['data' => $booking->fresh()]);
    }

    public function complete(int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return response()->json([
                'message' => 'Only confirmed bookings can be marked complete.',
            ], 422);
        }

        $from = $booking->status;

        $booking->update(['status' => Booking::STATUS_COMPLETED]);
        $booking->recordEvent(
            Booking::STATUS_COMPLETED,
            Booking::ACTOR_TENANT_USER,
            Auth::id(),
            $from,
        );

        return response()->json(['data' => $booking->fresh()]);
    }

    public function noShow(int $id): JsonResponse
    {
        $booking = $this->resolveBooking($id);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return response()->json([
                'message' => 'Only confirmed bookings can be marked as no-show.',
            ], 422);
        }

        $from = $booking->status;

        $booking->update(['status' => Booking::STATUS_NO_SHOW]);
        $booking->recordEvent(
            Booking::STATUS_NO_SHOW,
            Booking::ACTOR_TENANT_USER,
            Auth::id(),
            $from,
        );

        return response()->json(['data' => $booking->fresh()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make(($this->sanitizeBookingCustomerInput)($request->all()), [
            'service_id'     => ['required', 'integer', 'exists:booking_services,id'],
            'resource_id'    => ['required', 'integer', 'exists:booking_resources,id'],
            'starts_at'      => ['required', 'date'],
            'ends_at'        => ['required', 'date', 'after:starts_at'],
            'customer_name'  => ['required', 'string', 'max:120'],
            'customer_email' => ['required', 'email', 'max:200'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'internal_notes' => ['nullable', 'string'],
            'customer_notes' => ['nullable', 'string'],
            'force'          => ['sometimes', 'boolean'],
        ])->validate();

        $tenantId = (string) tenant('id');

        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $resource = BookingResource::forTenant($tenantId)->findOrFail((int) $validated['resource_id']);

        $startsAt = Carbon::parse($validated['starts_at']);
        $endsAt   = Carbon::parse($validated['ends_at']);
        $force    = (bool) ($validated['force'] ?? false);

        if (! $force) {
            $isAvailable = $this->checkAvailability($service, $resource, $startsAt, $endsAt);

            if (! $isAvailable) {
                return response()->json([
                    'message' => 'The requested time slot is not available. Pass force=true to override.',
                ], 409);
            }
        }

        $booking = DB::transaction(function () use ($validated, $tenantId, $service, $resource, $startsAt, $endsAt, $force) {
            if (! $force) {
                BookingResource::where('id', $resource->id)->lockForUpdate()->first();

                if (! $this->checkAvailability($service, $resource, $startsAt, $endsAt)) {
                    throw new \RuntimeException('Slot taken', 409);
                }
            }

            $booking = Booking::create([
                'tenant_id'        => $tenantId,
                'service_id'       => (int) $validated['service_id'],
                'resource_id'      => $resource->id,
                'customer_name'    => $validated['customer_name'],
                'customer_email'   => $validated['customer_email'],
                'customer_phone'   => $validated['customer_phone'] ?? null,
                'starts_at'        => $startsAt,
                'ends_at'          => $endsAt,
                'status'           => Booking::STATUS_CONFIRMED,
                'management_token' => Booking::generateToken(),
                'token_expires_at' => now()->addDays(365),
                'internal_notes'   => $validated['internal_notes'] ?? null,
                'customer_notes'   => $validated['customer_notes'] ?? null,
            ]);

            $note = $force ? 'Manual booking created by tenant (force=true — availability bypassed).' : 'Manual booking created by tenant.';

            $booking->recordEvent(
                Booking::STATUS_CONFIRMED,
                Booking::ACTOR_TENANT_USER,
                Auth::id(),
                null,
                $note,
            );

            return $booking;
        });

        return response()->json(['data' => $booking->fresh()->load(['service:id,name', 'resource:id,name'])], 201);
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private function tenantDomain(): string
    {
        /** @var Tenant $tenant */
        $tenant = tenancy()->tenant;
        return $tenant->domains()->first()?->domain
            ?? "{$tenant->slug}.byteforge.se";
    }

    private function resolveBooking(int $id): Booking
    {
        return Booking::forTenant((string) tenant('id'))->findOrFail($id);
    }

    private function checkAvailability(
        BookingService $service,
        BookingResource $resource,
        Carbon $startsAt,
        Carbon $endsAt,
    ): bool {
        if ($service->booking_mode === BookingService::MODE_SLOT) {
            $date  = $startsAt->copy()->startOfDay();
            $slots = $this->availability->getSlotsForDate($service, $resource, $date);

            return $slots->contains(fn ($s) =>
                $s['starts_at']->equalTo($startsAt) && $s['available'] === true
            );
        }

        return $this->availability->isRangeAvailable($service, $resource, $startsAt, $endsAt);
    }
}
