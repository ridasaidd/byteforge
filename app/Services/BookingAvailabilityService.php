<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingResourceBlock;
use App\Models\BookingService;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;

/**
 * Pure availability computation — no HTTP, no side effects.
 *
 * All scheduling logic is centralised here so every caller (public API,
 * CMS API, widget hold flow) goes through the same rule set. The individual
 * methods are designed to be unit-testable in isolation using in-memory model
 * instances — no database queries required for pure logic paths.
 *
 * Timezone convention
 * ───────────────────
 * Input Carbon dates carry the tenant's local timezone (callers must convert
 * before calling). Stored values are always UTC — the methods return Carbon
 * instances in UTC. Callers are responsible for the UTC ↔ local conversion.
 */
class BookingAvailabilityService
{
    // ─── Slot mode ────────────────────────────────────────────────────────────

    /**
     * Return all candidate slots for a given date, resource, and slot-mode service.
     *
     * Each item in the returned Collection is an array:
     *   ['starts_at' => Carbon (UTC), 'ends_at' => Carbon (UTC), 'available' => bool]
     *
     * Unavailable slots are included so the widget can render them greyed-out.
     *
     * Algorithm
     * ─────────
     * 1. If the resource is blocked on $date → return empty collection.
     * 2. Load availability windows for $date (specific_date overrides day_of_week).
     * 3. Walk each window using slot_interval_minutes (or duration_minutes) as step.
     * 4. Mark each candidate available/unavailable based on:
     *    - existing confirmed/pending-hold bookings (+ buffer) on the resource
     *    - advance_notice_hours (slot too soon)
     *    - max_advance_days (slot too far ahead)
     *
     * @param  Carbon  $date  Local date (time component is ignored); must carry the tenant timezone.
     * @return Collection<int, array{starts_at: Carbon, ends_at: Carbon, available: bool}>
     */
    public function getSlotsForDate(
        BookingService $service,
        BookingResource $resource,
        Carbon $date,
    ): Collection {
        // 1. Resource-level block check
        if ($this->isResourceBlockedOnDate($resource, $date)) {
            return collect();
        }

        // 2. Availability windows for this date
        $windows = $this->loadAvailabilityWindows($resource, $date);

        if ($windows->isEmpty()) {
            return collect();
        }

        $durationMinutes  = (int) $service->duration_minutes;
        $intervalMinutes  = (int) ($service->slot_interval_minutes ?? $durationMinutes);
        $bufferMinutes    = (int) ($service->buffer_minutes ?? 0);
        $noticeMinutes    = (int) ($service->advance_notice_hours ?? 0) * 60;
        $maxAdvanceDays   = $service->max_advance_days;
        $timezone         = $date->timezone;

        // 3. Earliest allowed start (advance notice) and latest allowed start (max advance)
        $earliestStart = Carbon::now('UTC')->addMinutes($noticeMinutes);
        $latestStart   = $maxAdvanceDays !== null
            ? Carbon::now($timezone)->addDays($maxAdvanceDays)->endOfDay()->utc()
            : null;

        // 4. Load existing bookings that block the resource on this date
        $existingBookings = $this->loadBlockingBookings($resource, $date);

        $slots = collect();

        foreach ($windows as $window) {
            // Parse time strings like "09:00:00" in the tenant timezone, on the given date
            $windowStart = Carbon::parse(
                $date->format('Y-m-d') . ' ' . $window->starts_at,
                $timezone,
            )->utc();

            $windowEnd = Carbon::parse(
                $date->format('Y-m-d') . ' ' . $window->ends_at,
                $timezone,
            )->utc();

            // Skip windows rendered invalid by DST (e.g. 02:00 on spring-forward night)
            if ($windowStart->greaterThanOrEqualTo($windowEnd)) {
                continue;
            }

            $cursor = $windowStart->copy();

            while (true) {
                $slotEnd = $cursor->copy()->addMinutes($durationMinutes);

                // Slot must fit entirely inside the window
                if ($slotEnd->greaterThan($windowEnd)) {
                    break;
                }

                $available = $this->isSlotAvailable(
                    slotStart: $cursor,
                    slotEnd: $slotEnd,
                    bufferMinutes: $bufferMinutes,
                    existingBookings: $existingBookings,
                    earliestStart: $earliestStart,
                    latestStart: $latestStart,
                );

                $slots->push([
                    'starts_at' => $cursor->copy(),
                    'ends_at'   => $slotEnd->copy(),
                    'available' => $available,
                ]);

                $cursor->addMinutes($intervalMinutes);
            }
        }

        // Deduplicate: if two overlapping windows produce the same start time,
        // keep the slot as available if any window considers it available.
        $slots = $slots
            ->groupBy(fn (array $s) => $s['starts_at']->toIso8601String())
            ->map(fn ($group) => [
                'starts_at' => $group->first()['starts_at'],
                'ends_at'   => $group->first()['ends_at'],
                'available' => $group->contains(fn ($s) => $s['available']),
            ])
            ->values();

        return $slots;
    }

    // ─── Range mode ───────────────────────────────────────────────────────────

    /**
     * Check whether a resource is available for a continuous date range (BnB / multi-day).
     *
     * Checks in order (short-circuits on first failure):
     *   1. $checkOut > $checkIn
     *   2. min_nights / max_nights constraints
     *   3. Resource block overlap
     *   4. Every calendar day in the range has an active (non-blocked) availability window
     *   5. No confirmed booking overlaps the requested window
     *
     * @param  Carbon  $checkIn   Local timezone; time carries the configured check-in time.
     * @param  Carbon  $checkOut  Local timezone; time carries the configured check-out time.
     */
    public function isRangeAvailable(
        BookingService $service,
        BookingResource $resource,
        Carbon $checkIn,
        Carbon $checkOut,
    ): bool {
        // 1. Logical order
        if (!$checkOut->greaterThan($checkIn)) {
            return false;
        }

        // 2. Night count constraints
        $nights = (int) $checkIn->diffInDays($checkOut);

        if ($service->min_nights !== null && $nights < $service->min_nights) {
            return false;
        }

        if ($service->max_nights !== null && $nights > $service->max_nights) {
            return false;
        }

        $checkInDate  = $checkIn->toDateString();
        $checkOutDate = $checkOut->toDateString();

        // 3. Block overlap — any block whose range intersects check-in..check-out
        $blocked = BookingResourceBlock::where('resource_id', $resource->id)
            ->where('start_date', '<=', $checkOutDate)
            ->where('end_date', '>=', $checkInDate)
            ->exists();

        if ($blocked) {
            return false;
        }

        // 4. Every night in the stay must have an active availability window
        // (We check the "night" dates: check-in day through the night before check-out)
        $cursor = $checkIn->copy()->startOfDay();
        $lastNight = $checkOut->copy()->startOfDay()->subDay();

        while ($cursor->lessThanOrEqualTo($lastNight)) {
            if (!$this->hasActiveWindowOnDate($resource, $cursor)) {
                return false;
            }
            $cursor->addDay();
        }

        // 5. Booking overlap — confirmed + pending-hold bookings that overlap the window
        $startsAtUtc = $checkIn->utc()->toDateTimeString();
        $endsAtUtc   = $checkOut->utc()->toDateTimeString();

        $conflict = Booking::where('resource_id', $resource->id)
            ->whereIn('status', [
                Booking::STATUS_CONFIRMED,
                Booking::STATUS_PENDING_HOLD,
            ])
            ->where('starts_at', '<', $endsAtUtc)
            ->where('ends_at', '>', $startsAtUtc)
            ->exists();

        return !$conflict;
    }

    // ─── Multi-resource finder ────────────────────────────────────────────────

    /**
     * Return all resources linked to $service that are available for the given window.
     *
     * For slot-mode services: $startsAt and $endsAt are the slot boundaries (UTC).
     * For range-mode services: $startsAt = check-in datetime, $endsAt = check-out datetime.
     *
     * @return Collection<int, BookingResource>
     */
    public function getAvailableResources(
        BookingService $service,
        Carbon $startsAt,
        Carbon $endsAt,
    ): Collection {
        return $service->resources()
            ->where('is_active', true)
            ->get()
            ->filter(function (BookingResource $resource) use ($service, $startsAt, $endsAt): bool {
                if ($service->booking_mode === BookingService::MODE_RANGE) {
                    return $this->isRangeAvailable($service, $resource, $startsAt, $endsAt);
                }

                // Slot mode — check the specific window directly
                return $this->isSlotWindowFree($resource, $service, $startsAt, $endsAt);
            })
            ->values();
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Check whether a specific slot window is free for a resource (slot mode).
     * Used by getAvailableResources() for the "any available" selection.
     */
    private function isSlotWindowFree(
        BookingResource $resource,
        BookingService $service,
        Carbon $startsAt,
        Carbon $endsAt,
    ): bool {
        $date = $startsAt->copy()->setTimezone($startsAt->timezone)->startOfDay();

        if ($this->isResourceBlockedOnDate($resource, $date)) {
            return false;
        }

        $bufferMinutes = (int) ($service->buffer_minutes ?? 0);

        $conflict = Booking::where('resource_id', $resource->id)
            ->whereIn('status', [
                Booking::STATUS_CONFIRMED,
                Booking::STATUS_PENDING_HOLD,
            ])
            ->where('starts_at', '<', $endsAt->toDateTimeString())
            ->where('ends_at', '>', $startsAt->copy()->subMinutes($bufferMinutes)->toDateTimeString())
            ->exists();

        return !$conflict;
    }

    /**
     * True if any BookingResourceBlock covers $date for this resource.
     */
    private function isResourceBlockedOnDate(BookingResource $resource, Carbon $date): bool
    {
        $dateStr = $date->toDateString();

        return BookingResourceBlock::where('resource_id', $resource->id)
            ->where('start_date', '<=', $dateStr)
            ->where('end_date', '>=', $dateStr)
            ->exists();
    }

    /**
     * Load the effective availability windows for a resource on a specific date.
     *
     * Precedence: specific_date rows override day_of_week rows for that date.
     * Returns only non-blocked windows (is_blocked = false).
     *
     * @return Collection<int, BookingAvailability>
     */
    private function loadAvailabilityWindows(BookingResource $resource, Carbon $date): Collection
    {
        $dateStr    = $date->toDateString();
        $dayOfWeek  = (int) $date->dayOfWeek; // 0 = Sunday … 6 = Saturday

        // Check for specific-date overrides first
        $specific = BookingAvailability::where('resource_id', $resource->id)
            ->whereDate('specific_date', $dateStr)
            ->get();

        if ($specific->isNotEmpty()) {
            // specific_date wins for this date; return only un-blocked windows
            return $specific->where('is_blocked', false)->values();
        }

        // Fall back to the weekly recurring schedule
        return BookingAvailability::where('resource_id', $resource->id)
            ->where('day_of_week', $dayOfWeek)
            ->whereNull('specific_date')
            ->where('is_blocked', false)
            ->get();
    }

    /**
     * True if the resource has at least one active (non-blocked) availability window for $date.
     * Used by isRangeAvailable() to validate every night of a stay.
     */
    private function hasActiveWindowOnDate(BookingResource $resource, Carbon $date): bool
    {
        return $this->loadAvailabilityWindows($resource, $date)->isNotEmpty();
    }

    /**
     * Load confirmed + pending-hold bookings that fall on $date for the resource.
     * Returns the minimal columns needed for overlap computation.
     *
     * @return Collection<int, Booking>
     */
    private function loadBlockingBookings(BookingResource $resource, Carbon $date): Collection
    {
        // Expand the query window slightly to capture bookings whose ends_at bleeds
        // into the date from the previous day (e.g. a midnight-spanning slot).
        $dayStart = $date->copy()->startOfDay()->utc()->toDateTimeString();
        $dayEnd   = $date->copy()->endOfDay()->utc()->toDateTimeString();

        return Booking::where('resource_id', $resource->id)
            ->whereIn('status', [
                Booking::STATUS_CONFIRMED,
                Booking::STATUS_PENDING_HOLD,
            ])
            ->where('starts_at', '<', $dayEnd)
            ->where('ends_at', '>', $dayStart)
            ->get(['id', 'starts_at', 'ends_at']);
    }

    /**
     * Determine whether a candidate slot is available given existing bookings and constraints.
     *
     * @param  Collection<int, Booking>  $existingBookings
     */
    private function isSlotAvailable(
        Carbon $slotStart,
        Carbon $slotEnd,
        int $bufferMinutes,
        Collection $existingBookings,
        Carbon $earliestStart,
        ?Carbon $latestStart,
    ): bool {
        // Too soon (advance notice)
        if ($slotStart->lessThan($earliestStart)) {
            return false;
        }

        // Too far ahead (max advance days)
        if ($latestStart !== null && $slotStart->greaterThan($latestStart)) {
            return false;
        }

        // Booking conflict: existing booking's occupied period = [starts_at, ends_at + buffer)
        foreach ($existingBookings as $booking) {
            $bookedStart = Carbon::parse($booking->starts_at)->utc();
            $bookedEnd   = Carbon::parse($booking->ends_at)->utc()->addMinutes($bufferMinutes);

            // Overlap if: slotStart < bookedEnd AND slotEnd > bookedStart
            if ($slotStart->lessThan($bookedEnd) && $slotEnd->greaterThan($bookedStart)) {
                return false;
            }
        }

        return true;
    }
}
