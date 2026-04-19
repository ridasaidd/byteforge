<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Actions\Api\SanitizeBookingCustomerInputAction;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Page;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\TenantPaymentProvider;
use App\Services\BookingAvailabilityService;
use App\Services\BookingPaymentService;
use App\Settings\TenantSettings;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\Booking\BookingCancelledByCustomerNotification;
use App\Notifications\Booking\BookingConfirmedNotification;
use App\Notifications\Booking\BookingReceivedNotification;
use App\Notifications\Booking\StaffBookingAssignedNotification;
use App\Notifications\Booking\TenantNewBookingNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Public (unauthenticated) booking endpoints.
 *
 * All routes must be behind `addon:booking` middleware.
 * No auth middleware — these are guest-facing.
 * Rate limiting is applied per-route in tenant.php.
 */
class PublicBookingController extends Controller
{
    public function __construct(
        private readonly BookingAvailabilityService $availability,
        private readonly BookingPaymentService $bookingPayment,
        private readonly SanitizeBookingCustomerInputAction $sanitizeBookingCustomerInput,
    ) {}

    // ─── GET /api/public/booking/config ─────────────────────────────────────────

    public function config(): JsonResponse
    {
        try {
            $settings = app(TenantSettings::class);
            return response()->json([
                'data' => [
                    'time_format' => $settings->time_format ?? 'HH:mm',
                    'date_format' => $settings->date_format ?? 'yyyy-MM-dd',
                ],
            ]);
        } catch (\Exception) {
            return response()->json([
                'data' => [
                    'time_format' => 'HH:mm',
                    'date_format' => 'yyyy-MM-dd',
                ],
            ]);
        }
    }

    // ─── GET /api/public/booking/services ─────────────────────────────────────

    public function services(): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $rows = BookingService::forTenant($tenantId)
            ->active()
            ->get(['id', 'name', 'description', 'booking_mode', 'duration_minutes', 'price', 'currency'])
            ->map(fn (BookingService $s) => [
                'id'               => $s->id,
                'name'             => $s->name,
                'description'      => $s->description,
                'booking_mode'     => $s->booking_mode,
                'duration_minutes' => $s->duration_minutes,
                'price'            => $s->price,
                'currency'         => $s->currency,
                'requires_payment' => (bool) $s->requires_payment,
            ]);

        return response()->json(['data' => $rows]);
    }

    // ─── GET /api/public/booking/resources ────────────────────────────────────

    public function resources(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'service_id' => ['required', 'integer', 'exists:booking_services,id'],
            'date'        => ['sometimes', 'date_format:Y-m-d'],
        ])->validate();

        $tenantId = (string) tenant('id');
        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $tz       = $this->tenantTimezone();

        $resources = $service->resources()
            ->where('is_active', true)
            ->get();

        if (isset($validated['date'])) {
            $date = Carbon::parse($validated['date'], $tz)->startOfDay();

            if ($service->booking_mode === BookingService::MODE_SLOT) {
                $resources = $resources->filter(function (BookingResource $r) use ($service, $date) {
                    $slots = $this->availability->getSlotsForDate($service, $r, $date);
                    return $slots->contains('available', true);
                });
            } else {
                // Range mode — just show active resources (availability is checked at booking time)
                // No date-based pre-filter for range; the customer picks check-in/out
            }
        }

        $data = $resources->values()->map(fn (BookingResource $r) => [
            'id'             => $r->id,
            'name'           => $r->name,
            'type'           => $r->type,
            'description'    => $r->description,
            'resource_label' => $r->resource_label,
            'checkin_time'   => $r->checkin_time,
            'checkout_time'  => $r->checkout_time,
        ]);

        return response()->json(['data' => $data]);
    }

    // ─── GET /api/public/booking/slots ────────────────────────────────────────

    public function slots(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'service_id'  => ['required', 'integer', 'exists:booking_services,id'],
            'resource_id' => ['required', 'integer', 'exists:booking_resources,id'],
            'date'        => ['required', 'date_format:Y-m-d'],
        ])->validate();

        $tenantId = (string) tenant('id');
        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $resource = BookingResource::forTenant($tenantId)->findOrFail((int) $validated['resource_id']);
        $tz       = $this->tenantTimezone();
        $date     = Carbon::parse($validated['date'], $tz)->startOfDay();

        if ($service->booking_mode !== BookingService::MODE_SLOT) {
            return response()->json(
                ['message' => 'Slot query is only valid for slot-mode services. Use the availability endpoint for range mode.'],
                422,
            );
        }

        $slots = $this->availability->getSlotsForDate($service, $resource, $date);

        $data = $slots->map(fn (array $s) => [
            'starts_at' => $s['starts_at']->toIso8601String(),
            'ends_at'   => $s['ends_at']->toIso8601String(),
            'available' => $s['available'],
        ]);

        return response()->json(['data' => $data]);
    }

    // ─── GET /api/public/booking/availability ─────────────────────────────────

    public function availability(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'service_id'  => ['required', 'integer', 'exists:booking_services,id'],
            'resource_id' => ['required', 'integer', 'exists:booking_resources,id'],
            'check_in'    => ['required', 'date_format:Y-m-d'],
            'check_out'   => ['required', 'date_format:Y-m-d', 'after:check_in'],
        ])->validate();

        $tenantId = (string) tenant('id');
        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $resource = BookingResource::forTenant($tenantId)->findOrFail((int) $validated['resource_id']);

        if ($service->booking_mode !== BookingService::MODE_RANGE) {
            return response()->json(
                ['message' => 'Availability query is only valid for range-mode services. Use the slots endpoint for slot mode.'],
                422,
            );
        }

        $tz       = $this->tenantTimezone();
        $checkIn  = Carbon::parse($validated['check_in'] . ' ' . $this->checkinTime($resource), $tz);
        $checkOut = Carbon::parse($validated['check_out'] . ' ' . $this->checkoutTime($resource), $tz);

        $available = $this->availability->isRangeAvailable($service, $resource, $checkIn, $checkOut);

        $nights = (int) $checkIn->diffInDays($checkOut);
        $message = $available ? null : $this->unavailableMessage($service, $nights);

        return response()->json(array_filter([
            'available' => $available,
            'message'   => $message,
        ], fn ($v) => $v !== null));
    }

    // ─── GET /api/public/booking/next-available ────────────────────────────────

    public function nextAvailable(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'service_id'  => ['required', 'integer', 'exists:booking_services,id'],
            'resource_id' => ['sometimes', 'integer', 'exists:booking_resources,id'],
        ])->validate();

        $tenantId = (string) tenant('id');
        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $tz       = $this->tenantTimezone();

        $resources = isset($validated['resource_id'])
            ? $service->resources()->where('id', (int) $validated['resource_id'])->where('is_active', true)->get()
            : $service->resources()->where('is_active', true)->get();

        if ($resources->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $maxLookAhead = (int) ($service->max_advance_days ?? 90);
        $today        = Carbon::now($tz)->startOfDay();

        for ($i = 0; $i <= $maxLookAhead; $i++) {
            $date = $today->copy()->addDays($i);

            foreach ($resources as $resource) {
                $slots = $this->availability->getSlotsForDate($service, $resource, $date);
                $first = $slots->firstWhere('available', true);

                if ($first !== null) {
                    return response()->json([
                        'data' => [
                            'date'        => $date->toDateString(),
                            'first_slot'  => $first['starts_at']->setTimezone($tz)->format('H:i'),
                            'resource_id' => $resource->id,
                        ],
                    ]);
                }
            }
        }

        return response()->json(['data' => null]);
    }

    // ─── GET /api/public/booking/{token} ──────────────────────────────────────

    public function show(string $token): JsonResponse
    {
        $booking = $this->resolveByToken($token);

        return response()->json([
            'data' => $this->publicBookingShape($booking),
        ]);
    }

    public function paymentSession(string $token): JsonResponse
    {
        $booking = $this->resolveByToken($token);

        if (!in_array($booking->status, [Booking::STATUS_AWAITING_PAYMENT, Booking::STATUS_CONFIRMED], true)) {
            return response()->json([
                'message' => 'This booking does not have an active payment session.',
            ], 422);
        }

        return response()->json([
            'data' => [
                'booking_id' => $booking->id,
                'status' => $booking->status,
                'customer_email' => $booking->customer_email,
                'payment' => $booking->payment ? $this->publicPaymentPayload($booking->payment) : null,
            ],
        ]);
    }

    // ─── POST /api/public/booking ─────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make(($this->sanitizeBookingCustomerInput)($request->all()), [
            'service_id'    => ['required', 'integer', 'exists:booking_services,id'],
            'resource_id'   => ['required', 'integer', 'exists:booking_resources,id'],
            'starts_at'     => ['required_if:booking_mode,slot', 'nullable', 'date'],
            'ends_at'       => ['nullable', 'date', 'after:starts_at'],
            'check_in'      => ['required_if:booking_mode,range', 'nullable', 'date_format:Y-m-d'],
            'check_out'     => ['nullable', 'date_format:Y-m-d', 'after:check_in'],
            'customer_name'  => ['required', 'string', 'max:120'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'customer_notes' => ['nullable', 'string', 'max:1000'],
        ])->validate();

        $tenantId = (string) tenant('id');
        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $resource = BookingResource::forTenant($tenantId)->findOrFail((int) $validated['resource_id']);
        $tz       = $this->tenantTimezone();
        $settings = $this->tenantSettings();

        // Resolve starts_at / ends_at depending on mode
        if ($service->booking_mode === BookingService::MODE_SLOT) {
            if (empty($validated['starts_at'])) {
                throw ValidationException::withMessages(['starts_at' => 'starts_at is required for slot-mode services.']);
            }
            $startsAt = Carbon::parse($validated['starts_at'])->utc();
            $endsAt   = isset($validated['ends_at'])
                ? Carbon::parse($validated['ends_at'])->utc()
                : $startsAt->copy()->addMinutes((int) $service->duration_minutes);
        } else {
            if (empty($validated['check_in']) || empty($validated['check_out'])) {
                throw ValidationException::withMessages(['check_in' => 'check_in and check_out are required for range-mode services.']);
            }
            $startsAt = Carbon::parse($validated['check_in'] . ' ' . $this->checkinTime($resource), $tz)->utc();
            $endsAt   = Carbon::parse($validated['check_out'] . ' ' . $this->checkoutTime($resource), $tz)->utc();
        }

        // Create booking inside a transaction with pessimistic lock on the resource row
        try {
            $booking = DB::transaction(function () use (
                $resource, $service, $startsAt, $endsAt,
                $validated, $tenantId, $tz, $settings,
            ) {
                // Lock resource row to prevent concurrent double-booking
                BookingResource::where('id', $resource->id)->lockForUpdate()->first();

                // Re-check availability inside the lock
                if ($service->booking_mode === BookingService::MODE_SLOT) {
                    $date  = $startsAt->copy()->setTimezone($tz)->startOfDay();
                    $slots = $this->availability->getSlotsForDate($service, $resource, $date);

                    $slotMatch = $slots->first(fn ($s) =>
                        $s['starts_at']->equalTo($startsAt) && $s['available'] === true
                    );

                    if ($slotMatch === null) {
                        throw ValidationException::withMessages([
                            'starts_at' => 'That time slot is no longer available.',
                        ]);
                    }
                } else {
                    $checkIn  = $startsAt->copy()->setTimezone($tz);
                    $checkOut = $endsAt->copy()->setTimezone($tz);

                    if (!$this->availability->isRangeAvailable($service, $resource, $checkIn, $checkOut)) {
                        throw ValidationException::withMessages([
                            'check_in' => 'Those dates are no longer available.',
                        ]);
                    }
                }

                $status = $settings->booking_auto_confirm
                    ? Booking::STATUS_CONFIRMED
                    : Booking::STATUS_PENDING;

                return Booking::create([
                    'tenant_id'       => $tenantId,
                    'service_id'      => $service->id,
                    'resource_id'     => $resource->id,
                    'customer_name'   => $validated['customer_name'],
                    'customer_email'  => $validated['customer_email'],
                    'customer_phone'  => $validated['customer_phone'] ?? null,
                    'customer_notes'  => $validated['customer_notes'] ?? null,
                    'starts_at'       => $startsAt,
                    'ends_at'         => $endsAt,
                    'status'          => $status,
                    'management_token' => Booking::generateToken(),
                    'token_expires_at' => $startsAt->copy()->addHours(24),
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            // DB-level no_double_book unique index fired — race condition lost
            throw ValidationException::withMessages([
                'starts_at' => 'That time slot was just taken. Please choose another.',
            ]);
        }

        $booking->recordEvent(
            toStatus: $booking->status,
            actorType: Booking::ACTOR_CUSTOMER,
            fromStatus: null,
            note: 'Booking created by customer',
        );

        $domain = $this->tenantDomain();
        $booking->load('resource');

        if ($booking->status === Booking::STATUS_CONFIRMED) {
            Notification::route('mail', [$booking->customer_email => $booking->customer_name])
                ->notify(new BookingConfirmedNotification($booking, $domain));

            // Notify assigned staff member if resource is a person with a linked user.
            $resource = $booking->resource;
            if ($resource?->type === BookingResource::TYPE_PERSON && $resource->user_id) {
                $staffUser = User::find($resource->user_id);
                if ($staffUser) {
                    $staffUser->notify(new StaffBookingAssignedNotification($booking, $domain, $resource));
                }
            }
        } else {
            Notification::route('mail', [$booking->customer_email => $booking->customer_name])
                ->notify(new BookingReceivedNotification($booking, $domain));
        }

        // Notify the tenant owner.
        $owner = $this->tenantOwner();
        if ($owner) {
            $owner->notify(new TenantNewBookingNotification($booking, $domain));
        }

        return response()->json([
            'data' => [
                'booking_id' => $booking->id,
                'starts_at'  => $booking->starts_at->toIso8601String(),
                'ends_at'    => $booking->ends_at->toIso8601String(),
                'status'     => $booking->status,
                'message'    => 'Confirmation email sent.',
            ],
        ], 201);
    }

    // ─── POST /api/public/booking/hold ───────────────────────────────────────

    public function hold(Request $request): JsonResponse
    {
        $validated = Validator::make(($this->sanitizeBookingCustomerInput)($request->all()), [
            'service_id'     => ['required', 'integer', 'exists:booking_services,id'],
            'resource_id'    => ['required', 'integer', 'exists:booking_resources,id'],
            'starts_at'      => ['nullable', 'date'],
            'ends_at'        => ['nullable', 'date', 'after:starts_at'],
            'check_in'       => ['nullable', 'date_format:Y-m-d'],
            'check_out'      => ['nullable', 'date_format:Y-m-d', 'after:check_in'],
            'customer_name'  => ['required', 'string', 'max:120'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'customer_notes' => ['nullable', 'string', 'max:1000'],
        ])->validate();

        $tenantId = (string) tenant('id');
        $service  = BookingService::forTenant($tenantId)->findOrFail((int) $validated['service_id']);
        $resource = BookingResource::forTenant($tenantId)->findOrFail((int) $validated['resource_id']);
        $tz       = $this->tenantTimezone();

        if ($service->booking_mode === BookingService::MODE_SLOT) {
            if (empty($validated['starts_at'])) {
                throw ValidationException::withMessages(['starts_at' => 'starts_at is required for slot-mode services.']);
            }
            $startsAt = Carbon::parse($validated['starts_at'])->utc();
            $endsAt   = isset($validated['ends_at'])
                ? Carbon::parse($validated['ends_at'])->utc()
                : $startsAt->copy()->addMinutes((int) $service->duration_minutes);
        } else {
            if (empty($validated['check_in']) || empty($validated['check_out'])) {
                throw ValidationException::withMessages(['check_in' => 'check_in and check_out are required for range-mode services.']);
            }
            $startsAt = Carbon::parse($validated['check_in'] . ' ' . $this->checkinTime($resource), $tz)->utc();
            $endsAt   = Carbon::parse($validated['check_out'] . ' ' . $this->checkoutTime($resource), $tz)->utc();
        }

        try {
            $booking = DB::transaction(function () use (
                $resource, $service, $startsAt, $endsAt, $validated, $tenantId, $tz,
            ) {
                BookingResource::where('id', $resource->id)->lockForUpdate()->first();

                if ($service->booking_mode === BookingService::MODE_SLOT) {
                    $date      = $startsAt->copy()->setTimezone($tz)->startOfDay();
                    $slots     = $this->availability->getSlotsForDate($service, $resource, $date);
                    $slotMatch = $slots->first(fn ($s) =>
                        $s['starts_at']->equalTo($startsAt) && $s['available'] === true
                    );
                    if ($slotMatch === null) {
                        throw ValidationException::withMessages([
                            'starts_at' => 'That time slot is no longer available.',
                        ]);
                    }
                } else {
                    $checkIn  = $startsAt->copy()->setTimezone($tz);
                    $checkOut = $endsAt->copy()->setTimezone($tz);
                    if (!$this->availability->isRangeAvailable($service, $resource, $checkIn, $checkOut)) {
                        throw ValidationException::withMessages([
                            'check_in' => 'Those dates are no longer available.',
                        ]);
                    }
                }

                return Booking::create([
                    'tenant_id'        => $tenantId,
                    'service_id'       => $service->id,
                    'resource_id'      => $resource->id,
                    'customer_name'    => $validated['customer_name'],
                    'customer_email'   => $validated['customer_email'],
                    'customer_phone'   => $validated['customer_phone'] ?? null,
                    'customer_notes'   => $validated['customer_notes'] ?? null,
                    'starts_at'        => $startsAt,
                    'ends_at'          => $endsAt,
                    'status'           => Booking::STATUS_PENDING_HOLD,
                    'management_token' => Booking::generateToken(),
                    'token_expires_at' => null,
                    'hold_expires_at'  => now()->addMinutes(10),
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'starts_at' => 'That time slot was just taken. Please choose another.',
            ]);
        }

        return response()->json([
            'data' => [
                'hold_token' => $booking->management_token,
                'expires_at' => $booking->hold_expires_at?->toIso8601String(),
            ],
        ], 201);
    }

    // ─── POST /api/public/booking/hold/{token} ────────────────────────────────

    public function confirmHold(string $token): JsonResponse
    {
        $booking = Booking::where('management_token', $token)
            ->where('status', Booking::STATUS_PENDING_HOLD)
            ->first();

        if ($booking === null || (string) $booking->tenant_id !== (string) tenant('id')) {
            abort(404);
        }

        if ($booking->hold_expires_at !== null && $booking->hold_expires_at->isPast()) {
            return response()->json(
                ['message' => 'This hold has expired. Please start a new booking.'],
                410,
            );
        }

        // Phase 14: Check if payment is required for this booking
        if ($this->bookingPayment->bookingRequiresPayment($booking)) {
            try {
                // Create payment; this updates the booking to awaiting_payment status
                $payment = $this->bookingPayment->createPaymentForBooking($booking);

                // Refresh booking after status update
                $booking->refresh();

                // Return response with payment gateway information
                // The frontend will use this to redirect to payment provider
                return response()->json([
                    'data' => [
                        'booking_id' => $booking->id,
                        'starts_at'  => $booking->starts_at?->toIso8601String(),
                        'ends_at'    => $booking->ends_at?->toIso8601String(),
                        'status'     => $booking->status,
                        'next_action' => 'payment_required',
                        'payment_url' => $this->paymentUrl($booking->management_token),
                        'payment_id' => $payment?->id,
                        'payment'    => $payment ? $this->publicPaymentPayload($payment) : null,
                        'message'    => 'Payment required. Redirecting to payment provider...',
                    ],
                ]);
            } catch (\Exception $e) {
                return response()->json(
                    [
                        'message' => 'Payment processing failed. Please try again later.',
                        'error'   => config('app.debug') ? $e->getMessage() : null,
                    ],
                    422,
                );
            }
        }

        // No payment required — proceed with existing flow
        $settings  = $this->tenantSettings();
        $newStatus = $settings->booking_auto_confirm
            ? Booking::STATUS_CONFIRMED
            : Booking::STATUS_PENDING;

        $newToken = Booking::generateToken();

        $booking->update([
            'status'           => $newStatus,
            'hold_expires_at'  => null,
            'management_token' => $newToken,
            'token_expires_at' => $booking->starts_at?->copy()->addHours(24),
        ]);

        $booking->recordEvent(
            toStatus: $newStatus,
            actorType: Booking::ACTOR_CUSTOMER,
            fromStatus: Booking::STATUS_PENDING_HOLD,
            note: 'Booking confirmed from hold by customer',
        );

        $domain = $this->tenantDomain();
        $booking->load('resource');

        if ($newStatus === Booking::STATUS_CONFIRMED) {
            Notification::route('mail', [$booking->customer_email => $booking->customer_name])
                ->notify(new BookingConfirmedNotification($booking, $domain));

            // Notify assigned staff member if resource is a person with a linked user.
            $resource = $booking->resource;
            if ($resource?->type === BookingResource::TYPE_PERSON && $resource->user_id) {
                $staffUser = User::find($resource->user_id);
                if ($staffUser) {
                    $staffUser->notify(new StaffBookingAssignedNotification($booking, $domain, $resource));
                }
            }
        } else {
            Notification::route('mail', [$booking->customer_email => $booking->customer_name])
                ->notify(new BookingReceivedNotification($booking, $domain));
        }

        // Notify the tenant owner.
        $owner = $this->tenantOwner();
        if ($owner) {
            $owner->notify(new TenantNewBookingNotification($booking, $domain));
        }

        return response()->json([
            'data' => [
                'booking_id' => $booking->id,
                'starts_at'  => $booking->starts_at?->toIso8601String(),
                'ends_at'    => $booking->ends_at?->toIso8601String(),
                'status'     => $booking->status,
                'next_action' => 'confirmed',
                'message'    => 'Confirmation email sent.',
            ],
        ]);
    }

    // ─── PATCH /api/public/booking/{token}/cancel ─────────────────────────────

    public function cancel(string $token): JsonResponse
    {
        $booking = $this->resolveByToken($token);

        if (!in_array($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED], true)) {
            return response()->json(
                ['message' => 'This booking cannot be cancelled in its current status.'],
                422,
            );
        }

        $fromStatus = $booking->status;

        // Phase 14: Process refund if booking has an associated payment
        $refundSucceeded = true;
        if ($booking->payment_id) {
            $refundSucceeded = $this->bookingPayment->refundBookingIfPaid(
                $booking,
                'Cancelled by customer via management link'
            );

            if (!$refundSucceeded) {
                return response()->json(
                    [
                        'message' => 'Refund processing failed. Please contact support to process your refund manually.',
                    ],
                    422,
                );
            }
        }

        $booking->update([
            'status'       => Booking::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => Booking::CANCELLED_BY_CUSTOMER,
        ]);

        $booking->recordEvent(
            toStatus: Booking::STATUS_CANCELLED,
            actorType: Booking::ACTOR_CUSTOMER,
            fromStatus: $fromStatus,
            note: 'Cancelled by customer via management link',
        );

        $domain = $this->tenantDomain();
        Notification::route('mail', [$booking->customer_email => $booking->customer_name])
            ->notify(new BookingCancelledByCustomerNotification($booking, $domain));

        return response()->json(['data' => ['status' => Booking::STATUS_CANCELLED]]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function resolveByToken(string $token): Booking
    {
        // Constant-time lookup — token is stored hashed-equivalent via unique indexed hex
        $booking = Booking::where('management_token', $token)->first();

        if ($booking === null || (string) $booking->tenant_id !== (string) tenant('id')) {
            abort(404);
        }

        if ($booking->token_expires_at !== null && $booking->token_expires_at->isPast()) {
            abort(410, 'This booking link has expired.');
        }

        return $booking;
    }

    private function publicBookingShape(Booking $booking): array
    {
        return [
            'id'             => $booking->id,
            'service_id'     => $booking->service_id,
            'resource_id'    => $booking->resource_id,
            'customer_name'  => $booking->customer_name,
            'customer_email' => $booking->customer_email,
            'customer_phone' => $booking->customer_phone,
            'customer_notes' => $booking->customer_notes,
            'starts_at'      => $booking->starts_at?->toIso8601String(),
            'ends_at'        => $booking->ends_at?->toIso8601String(),
            'status'         => $booking->status,
            'payment'        => $booking->payment ? $this->publicPaymentPayload($booking->payment) : null,
            // management_token is in $hidden — never returned
        ];
    }

    private function paymentUrl(string $token): string
    {
        $path = '/booking/payment';

        try {
            $paymentPageId = $this->tenantSettings()->booking_payment_page_id;

            if ($paymentPageId !== null) {
                $page = Page::query()
                    ->where('tenant_id', (string) tenant('id'))
                    ->whereKey($paymentPageId)
                    ->where('status', 'published')
                    ->first();

                if ($page !== null) {
                    $path = $page->is_homepage ? '/' : "/pages/{$page->slug}";
                }
            }
        } catch (\Throwable) {
        }

        return url($path) . '#token=' . $token;
    }

    private function tenantDomain(): string
    {
        /** @var Tenant $tenant */
        $tenant = tenancy()->tenant;
        return $tenant->domains()->first()?->domain
            ?? "{$tenant->slug}.byteforge.se";
    }

    /**
     * Return the tenant owner User, or null if none is configured.
     * Membership records live on the central DB via the Tenant model relationship.
     */
    private function tenantOwner(): ?User
    {
        /** @var Tenant $tenant */
        $tenant = tenancy()->tenant;
        $membership = $tenant->memberships()->where('role', 'owner')->with('user')->first();
        return $membership?->user;
    }

    private function tenantTimezone(): string
    {
        try {
            return app(TenantSettings::class)->timezone;
        } catch (\Throwable) {
            return 'UTC';
        }
    }

    private function tenantSettings(): TenantSettings
    {
        return app(TenantSettings::class);
    }

    /**
     * Build a guest-safe payment payload for the booking widget.
     *
     * Only provider data needed to continue the guest payment flow should be returned.
     * Secrets remain server-side.
     *
     * @return array<string, mixed>
     */
    private function publicPaymentPayload(Payment $payment): array
    {
        $providerConfig = TenantPaymentProvider::query()
            ->forTenant((string) $payment->tenant_id)
            ->where('provider', (string) $payment->provider)
            ->active()
            ->first();

        $payload = [
            'id' => $payment->id,
            'provider' => $payment->provider,
            'provider_transaction_id' => $payment->provider_transaction_id,
            'status' => $payment->status,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
        ];

        if ($payment->provider === 'stripe') {
            $payload['client_secret'] = data_get($payment->provider_response, 'client_secret');
            $payload['publishable_key'] = data_get($providerConfig?->credentials, 'publishable_key');
        }

        if ($payment->provider === 'swish') {
            $payload['redirect_url'] = data_get($payment->provider_response, 'paymentRequestUrl')
                ?? data_get($payment->provider_response, 'location')
                ?? data_get($payment->provider_response, 'redirect_url');
        }

        if ($payment->provider === 'klarna') {
            $payload['client_token'] = data_get($payment->provider_response, 'client_token');
            $payload['session_id'] = data_get($payment->provider_response, 'session_id', $payment->provider_transaction_id);
        }

        return $payload;
    }

    private function checkinTime(?BookingResource $resource = null): string
    {
        if ($resource?->type === BookingResource::TYPE_SPACE && ! empty($resource->checkin_time)) {
            return substr((string) $resource->checkin_time, 0, 5);
        }

        try {
            return app(TenantSettings::class)->booking_checkin_time;
        } catch (\Throwable) {
            return '15:00';
        }
    }

    private function checkoutTime(?BookingResource $resource = null): string
    {
        if ($resource?->type === BookingResource::TYPE_SPACE && ! empty($resource->checkout_time)) {
            return substr((string) $resource->checkout_time, 0, 5);
        }

        try {
            return app(TenantSettings::class)->booking_checkout_time;
        } catch (\Throwable) {
            return '11:00';
        }
    }

    private function unavailableMessage(BookingService $service, int $nights): string
    {
        if ($service->min_nights !== null && $nights < $service->min_nights) {
            return "Minimum stay is {$service->min_nights} night(s).";
        }
        if ($service->max_nights !== null && $nights > $service->max_nights) {
            return "Maximum stay is {$service->max_nights} night(s).";
        }
        return 'Those dates are not available.';
    }
}
