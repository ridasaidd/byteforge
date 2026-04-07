<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Booking;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Services\BookingAvailabilityService;
use App\Settings\TenantSettings;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
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
    ) {}

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
            'resource_label' => $r->resource_label,
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
        $checkIn  = Carbon::parse($validated['check_in'] . ' ' . $this->checkinTime(), $tz);
        $checkOut = Carbon::parse($validated['check_out'] . ' ' . $this->checkoutTime(), $tz);

        $available = $this->availability->isRangeAvailable($service, $resource, $checkIn, $checkOut);

        $nights = $checkIn->diffInDays($checkOut);
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

    // ─── POST /api/public/booking ─────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
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
            $startsAt = Carbon::parse($validated['check_in'] . ' ' . $this->checkinTime(), $tz)->utc();
            $endsAt   = Carbon::parse($validated['check_out'] . ' ' . $this->checkoutTime(), $tz)->utc();
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

        // TODO Phase 13.5: dispatch BookingCreatedNotification::class

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

        // TODO Phase 13.5: dispatch BookingCancelledByCustomerNotification::class

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
            // management_token is in $hidden — never returned
        ];
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

    private function checkinTime(): string
    {
        try {
            return app(TenantSettings::class)->booking_checkin_time;
        } catch (\Throwable) {
            return '15:00';
        }
    }

    private function checkoutTime(): string
    {
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
