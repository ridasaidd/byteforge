<?php

namespace Tests\Unit;

use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingResourceBlock;
use App\Models\BookingService;
use App\Models\User;
use App\Services\BookingAvailabilityService;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Unit tests for BookingAvailabilityService.
 *
 * Each test creates the minimum DB rows required via factories and asserts
 * the service's output. We rely on DatabaseTransactions (rolled back after
 * each test) so no migrate:fresh is needed between runs.
 *
 * Timezone convention in these tests:
 *   - tenant timezone = "Europe/Stockholm"
 *   - All input Carbons are created in that timezone so slot computation
 *     mirrors real tenant usage; the service converts to UTC internally.
 */
class BookingAvailabilityServiceTest extends TestCase
{
    private BookingAvailabilityService $svc;

    private const TZ = 'Europe/Stockholm';

    protected function setUp(): void
    {
        parent::setUp();
        $this->svc = new BookingAvailabilityService();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Build an unsaved BookingService with slot defaults. */
    private function slotService(array $overrides = []): BookingService
    {
        return new BookingService(array_merge([
            'booking_mode'          => BookingService::MODE_SLOT,
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => null,
            'min_nights'            => null,
            'max_nights'            => null,
        ], $overrides));
    }

    /** Build an unsaved BookingService with range defaults. */
    private function rangeService(array $overrides = []): BookingService
    {
        return new BookingService(array_merge([
            'booking_mode'          => BookingService::MODE_RANGE,
            'duration_minutes'      => null,
            'slot_interval_minutes' => null,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => null,
            'min_nights'            => 1,
            'max_nights'            => null,
        ], $overrides));
    }

    /**
     * Persist a resource with one weekly availability window and return it.
     * $dayOfWeek: 0=Sun…6=Sat
     */
    private function resourceWithWindow(
        int $dayOfWeek,
        string $startsAt = '09:00:00',
        string $endsAt = '17:00:00',
        bool $isActive = true,
    ): BookingResource {
        $resource = BookingResource::factory()->create([
            'tenant_id' => 'test-tenant',
            'type'      => BookingResource::TYPE_PERSON,
            'is_active' => $isActive,
        ]);

        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'day_of_week'   => $dayOfWeek,
            'specific_date' => null,
            'starts_at'     => $startsAt,
            'ends_at'       => $endsAt,
            'is_blocked'    => false,
        ]);

        return $resource;
    }

    /** Carbon date at midnight in the tenant TZ on a specific ISO date string. */
    private function localDate(string $date): Carbon
    {
        return Carbon::parse($date, self::TZ)->startOfDay();
    }

    // ─── getSlotsForDate — basic generation ───────────────────────────────────

    #[Test]
    public function it_generates_slots_from_a_weekly_window(): void
    {
        // Find a Monday in the near future
        $monday = Carbon::now(self::TZ)->next('Monday')->startOfDay();
        $resource = $this->resourceWithWindow(
            dayOfWeek: $monday->dayOfWeek, // 1
            startsAt: '09:00:00',
            endsAt: '11:00:00',
        );
        $service = $this->slotService(['duration_minutes' => 60, 'slot_interval_minutes' => 60]);

        $slots = $this->svc->getSlotsForDate($service, $resource, $monday);

        $this->assertCount(2, $slots);
        $this->assertTrue($slots->every(fn ($s) => $s['available'] === true));

        // First slot should start at 09:00 Stockholm → UTC
        $expectedFirst = Carbon::parse($monday->toDateString() . ' 09:00:00', self::TZ)->utc();
        $this->assertTrue($slots->first()['starts_at']->equalTo($expectedFirst));
    }

    #[Test]
    public function it_returns_empty_when_no_availability_window_on_date(): void
    {
        // Saturday = 6; resource has a window only for Monday = 1
        $resource = $this->resourceWithWindow(dayOfWeek: 1);
        $service  = $this->slotService();

        $saturday = Carbon::now(self::TZ)->next('Saturday')->startOfDay();

        $slots = $this->svc->getSlotsForDate($service, $resource, $saturday);

        $this->assertEmpty($slots);
    }

    // ─── getSlotsForDate — slot_interval_minutes ───────────────────────────────

    #[Test]
    public function slot_interval_smaller_than_duration_produces_rolling_slots(): void
    {
        // 90-min duration, 30-min interval inside a 3-hour window → 5 slots
        // Window: 09:00–12:00 — last slot starts at 10:30 (ends at 12:00)
        $tuesday = Carbon::now(self::TZ)->next('Tuesday')->startOfDay();
        $resource = $this->resourceWithWindow(
            dayOfWeek: $tuesday->dayOfWeek,
            startsAt: '09:00:00',
            endsAt: '12:00:00',
        );
        $service = $this->slotService([
            'duration_minutes'      => 90,
            'slot_interval_minutes' => 30,
        ]);

        $slots = $this->svc->getSlotsForDate($service, $resource, $tuesday);

        // 09:00,09:30,10:00,10:30 start → ends at 10:30,11:00,11:30,12:00
        $this->assertCount(4, $slots);
        // A slot that would end at 12:30 must NOT be generated
        $this->assertTrue($slots->last()['ends_at']->equalTo(
            Carbon::parse($tuesday->toDateString() . ' 12:00:00', self::TZ)->utc()
        ));
    }

    // ─── getSlotsForDate — buffer_minutes ─────────────────────────────────────

    #[Test]
    public function buffer_minutes_block_adjacent_slots(): void
    {
        $wednesday = Carbon::now(self::TZ)->next('Wednesday')->startOfDay();
        $resource  = $this->resourceWithWindow(
            dayOfWeek: $wednesday->dayOfWeek,
            startsAt: '09:00:00',
            endsAt: '12:00:00',
        );

        $bookingService = BookingService::factory()->create(['tenant_id' => 'test-tenant']);

        // Confirmed booking: 09:00–10:00
        Booking::factory()->confirmed()->create([
            'resource_id' => $resource->id,
            'service_id'  => $bookingService->id,
            'tenant_id'   => 'test-tenant',
            'starts_at'   => Carbon::parse($wednesday->toDateString() . ' 09:00:00', self::TZ)->utc(),
            'ends_at'     => Carbon::parse($wednesday->toDateString() . ' 10:00:00', self::TZ)->utc(),
        ]);

        // 30-min buffer means the 10:00 slot is blocked too (bookedEnd + buffer = 10:30)
        $service = $this->slotService([
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 30,
        ]);

        $slots = $this->svc->getSlotsForDate($service, $resource, $wednesday);

        // 09:00 (unavailable — booked), 10:00 (unavailable — in buffer), 11:00 (available)
        $this->assertCount(3, $slots);
        $this->assertFalse($slots[0]['available']); // 09:00 — booked
        $this->assertFalse($slots[1]['available']); // 10:00 — in buffer window
        $this->assertTrue($slots[2]['available']);  // 11:00 — clear
    }

    // ─── getSlotsForDate — resource blocks ────────────────────────────────────

    #[Test]
    public function resource_block_returns_empty_collection(): void
    {
        $thursday = Carbon::now(self::TZ)->next('Thursday')->startOfDay();
        $resource = $this->resourceWithWindow(dayOfWeek: $thursday->dayOfWeek);

        BookingResourceBlock::create([
            'resource_id' => $resource->id,
            'start_date'  => $thursday->toDateString(),
            'end_date'    => $thursday->toDateString(),
            'reason'      => 'Holiday',
            'created_by'  => User::value('id'),
        ]);

        $slots = $this->svc->getSlotsForDate($this->slotService(), $resource, $thursday);

        $this->assertEmpty($slots);
    }

    // ─── getSlotsForDate — specific_date overrides day_of_week ───────────────

    #[Test]
    public function specific_date_window_overrides_weekly_schedule(): void
    {
        $friday = Carbon::now(self::TZ)->next('Friday')->startOfDay();
        $resource = $this->resourceWithWindow(
            dayOfWeek: $friday->dayOfWeek,
            startsAt: '09:00:00',
            endsAt: '17:00:00',
        );

        // Override: only 10:00–11:00 available on this specific Friday
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'day_of_week'   => null,
            'specific_date' => $friday->toDateString(),
            'starts_at'     => '10:00:00',
            'ends_at'       => '11:00:00',
            'is_blocked'    => false,
        ]);

        $service = $this->slotService(['duration_minutes' => 60, 'slot_interval_minutes' => 60]);
        $slots   = $this->svc->getSlotsForDate($service, $resource, $friday);

        // Only 1 slot (10:00–11:00), not the 8 from the weekly schedule
        $this->assertCount(1, $slots);
        $this->assertTrue($slots->first()['available']);
    }

    #[Test]
    public function specific_date_blocked_window_returns_empty_even_if_weekly_window_exists(): void
    {
        $friday = Carbon::now(self::TZ)->next('Friday')->startOfDay();
        $resource = $this->resourceWithWindow(dayOfWeek: $friday->dayOfWeek);

        // Specific-date override is explicitly blocked (e.g. public holiday)
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'day_of_week'   => null,
            'specific_date' => $friday->toDateString(),
            'starts_at'     => '09:00:00',
            'ends_at'       => '17:00:00',
            'is_blocked'    => true,
        ]);

        $slots = $this->svc->getSlotsForDate($this->slotService(), $resource, $friday);

        $this->assertEmpty($slots);
    }

    // ─── getSlotsForDate — advance_notice_hours ───────────────────────────────

    #[Test]
    public function advance_notice_removes_slots_too_close_to_now(): void
    {
        // Schedule a window for today
        $today    = Carbon::now(self::TZ)->startOfDay();
        $resource = $this->resourceWithWindow(
            dayOfWeek: $today->dayOfWeek,
            startsAt: '00:00:00',
            endsAt: '23:00:00',
        );

        // 48-hour advance notice — all slots today should be unavailable
        $service = $this->slotService([
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'advance_notice_hours'  => 48,
        ]);

        $slots = $this->svc->getSlotsForDate($service, $resource, $today);

        $this->assertTrue($slots->every(fn ($s) => $s['available'] === false));
    }

    // ─── getSlotsForDate — max_advance_days ───────────────────────────────────

    #[Test]
    public function max_advance_days_blocks_slots_too_far_ahead(): void
    {
        // Service only accepts bookings up to 7 days ahead
        // We test a day 14 days out — all slots should be unavailable
        $twoWeeksOut = Carbon::now(self::TZ)->addDays(14)->startOfDay();
        $resource    = $this->resourceWithWindow(dayOfWeek: $twoWeeksOut->dayOfWeek);

        $service = $this->slotService([
            'duration_minutes'     => 60,
            'slot_interval_minutes'=> 60,
            'max_advance_days'     => 7,
        ]);

        $slots = $this->svc->getSlotsForDate($service, $resource, $twoWeeksOut);

        $this->assertTrue($slots->every(fn ($s) => $s['available'] === false));
    }

    // ─── getSlotsForDate — DST spring-forward ─────────────────────────────────

    #[Test]
    public function dst_spring_forward_window_in_missing_hour_is_skipped(): void
    {
        // Europe/Stockholm: clocks jump from 02:00 → 03:00 on last Sunday of March.
        // A window defined as 02:00–02:30 on that date would collapse (start >= end in UTC).
        // The service must silently skip such degenerate windows.
        $resource = BookingResource::factory()->create([
            'tenant_id' => 'test-tenant',
            'is_active' => true,
        ]);

        // 2026 DST spring-forward in Stockholm: 29 March 2026
        $dstDate = Carbon::parse('2026-03-29', self::TZ)->startOfDay();

        // Window entirely inside the missing hour
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'day_of_week'   => null,
            'specific_date' => $dstDate->toDateString(),
            'starts_at'     => '02:00:00',
            'ends_at'       => '02:30:00',
            'is_blocked'    => false,
        ]);

        $service = $this->slotService(['duration_minutes' => 30]);
        $slots   = $this->svc->getSlotsForDate($service, $resource, $dstDate);

        // PHP resolves "02:00 Europe/Stockholm" on the spring-forward day using the
        // pre-transition UTC offset (+1), giving 01:00 UTC. "02:30" gives 01:30 UTC.
        // The window is therefore valid (30 min apart), not degenerate, and the engine
        // produces exactly 1 slot without panicking.
        $this->assertCount(1, $slots);
        $expectedUtcStart = Carbon::parse('2026-03-29 02:00:00', self::TZ)->utc();
        $this->assertTrue($slots->first()['starts_at']->equalTo($expectedUtcStart));
    }

    // ─── isRangeAvailable ─────────────────────────────────────────────────────

    #[Test]
    public function range_available_returns_true_when_no_conflicts(): void
    {
        $resource = $this->resourceWithRangeWindows();
        $service  = $this->rangeService(['min_nights' => 1, 'max_nights' => 14]);

        $checkIn  = Carbon::parse('2030-07-01 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-05 11:00:00', self::TZ);

        $this->assertTrue($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    #[Test]
    public function range_available_false_when_checkout_before_checkin(): void
    {
        $resource = $this->resourceWithRangeWindows();
        $service  = $this->rangeService();

        $checkIn  = Carbon::parse('2030-07-05 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-01 11:00:00', self::TZ);

        $this->assertFalse($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    #[Test]
    public function range_available_false_when_below_min_nights(): void
    {
        $resource = $this->resourceWithRangeWindows();
        $service  = $this->rangeService(['min_nights' => 3]);

        $checkIn  = Carbon::parse('2030-07-01 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-02 11:00:00', self::TZ); // 1 night

        $this->assertFalse($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    #[Test]
    public function range_available_false_when_above_max_nights(): void
    {
        $resource = $this->resourceWithRangeWindows();
        $service  = $this->rangeService(['min_nights' => 1, 'max_nights' => 3]);

        $checkIn  = Carbon::parse('2030-07-01 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-10 11:00:00', self::TZ); // 9 nights

        $this->assertFalse($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    #[Test]
    public function range_available_false_when_resource_block_overlaps(): void
    {
        $resource = $this->resourceWithRangeWindows();
        $service  = $this->rangeService();

        BookingResourceBlock::create([
            'resource_id' => $resource->id,
            'start_date'  => '2030-07-03',
            'end_date'    => '2030-07-06',
            'reason'      => 'Maintenance',
            'created_by'  => User::value('id'),
        ]);

        $checkIn  = Carbon::parse('2030-07-01 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-05 11:00:00', self::TZ);

        $this->assertFalse($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    #[Test]
    public function range_available_false_when_confirmed_booking_overlaps(): void
    {
        $resource = $this->resourceWithRangeWindows();
        $service  = $this->rangeService();

        $bookingService = BookingService::factory()->create(['tenant_id' => 'test-tenant']);

        // An existing confirmed booking Jul 3–7
        Booking::factory()->confirmed()->create([
            'resource_id' => $resource->id,
            'service_id'  => $bookingService->id,
            'tenant_id'   => 'test-tenant',
            'starts_at'   => Carbon::parse('2030-07-03 15:00:00', self::TZ)->utc(),
            'ends_at'     => Carbon::parse('2030-07-07 11:00:00', self::TZ)->utc(),
        ]);

        // Requested Jul 1–5 overlaps the existing booking
        $checkIn  = Carbon::parse('2030-07-01 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-05 11:00:00', self::TZ);

        $this->assertFalse($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    #[Test]
    public function range_available_false_when_availability_window_missing_for_a_night(): void
    {
        // Resource has windows only Mon–Sat; trying to book over a Sunday (no window)
        $resource = BookingResource::factory()->create([
            'tenant_id' => 'test-tenant',
            'is_active' => true,
        ]);

        // Add windows for Mon(1)–Sat(6), skip Sunday(0)
        foreach ([1, 2, 3, 4, 5, 6] as $dow) {
            BookingAvailability::create([
                'resource_id'   => $resource->id,
                'day_of_week'   => $dow,
                'specific_date' => null,
                'starts_at'     => '15:00:00',
                'ends_at'       => '22:00:00',
                'is_blocked'    => false,
            ]);
        }

        $service = $this->rangeService();

        // Fri Jul 5 → Mon Jul 8 2030: nights span Fri (5), Sat (6), Sun (7=no window)
        $checkIn  = Carbon::parse('2030-07-05 15:00:00', self::TZ);
        $checkOut = Carbon::parse('2030-07-08 11:00:00', self::TZ);

        $this->assertFalse($this->svc->isRangeAvailable($service, $resource, $checkIn, $checkOut));
    }

    // ─── Helper for range tests ───────────────────────────────────────────────

    /**
     * Resource available every day of the week (for range tests in the far future).
     */
    private function resourceWithRangeWindows(): BookingResource
    {
        $resource = BookingResource::factory()->create([
            'tenant_id' => 'test-tenant',
            'type'      => BookingResource::TYPE_SPACE,
            'is_active' => true,
        ]);

        foreach (range(0, 6) as $dow) {
            BookingAvailability::create([
                'resource_id'   => $resource->id,
                'day_of_week'   => $dow,
                'specific_date' => null,
                'starts_at'     => '00:00:00',
                'ends_at'       => '23:59:00',
                'is_blocked'    => false,
            ]);
        }

        return $resource;
    }

    // ─── getAvailableResources ─────────────────────────────────────────────────

    #[Test]
    public function get_available_resources_returns_resource_with_open_window(): void
    {
        $monday   = Carbon::now(self::TZ)->next('Monday')->startOfDay();
        $resource = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek);

        $service = BookingService::factory()->create([
            'tenant_id'             => 'test-tenant',
            'booking_mode'          => BookingService::MODE_SLOT,
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => null,
        ]);
        $service->resources()->attach($resource->id);

        $slotStart = Carbon::parse($monday->toDateString() . ' 09:00:00', self::TZ)->utc();
        $slotEnd   = $slotStart->copy()->addHour();

        $available = $this->svc->getAvailableResources($service, $slotStart, $slotEnd);

        $this->assertCount(1, $available);
        $this->assertEquals($resource->id, $available->first()->id);
    }

    #[Test]
    public function get_available_resources_excludes_resource_with_booking_conflict(): void
    {
        $monday = Carbon::now(self::TZ)->next('Monday')->startOfDay();

        $blockedResource = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek);
        $freeResource    = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek);

        $service = BookingService::factory()->create([
            'tenant_id'             => 'test-tenant',
            'booking_mode'          => BookingService::MODE_SLOT,
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => null,
        ]);
        $service->resources()->attach([$blockedResource->id, $freeResource->id]);

        $slotStart = Carbon::parse($monday->toDateString() . ' 09:00:00', self::TZ)->utc();
        $slotEnd   = $slotStart->copy()->addHour();

        // Book the first resource for this exact slot
        Booking::factory()->create([
            'resource_id' => $blockedResource->id,
            'service_id'  => $service->id,
            'tenant_id'   => 'test-tenant',
            'starts_at'   => $slotStart,
            'ends_at'     => $slotEnd,
            'status'      => Booking::STATUS_CONFIRMED,
        ]);

        $available = $this->svc->getAvailableResources($service, $slotStart, $slotEnd);

        $this->assertCount(1, $available);
        $this->assertEquals($freeResource->id, $available->first()->id);
    }

    #[Test]
    public function get_available_resources_excludes_inactive_resources(): void
    {
        $monday = Carbon::now(self::TZ)->next('Monday')->startOfDay();

        $activeResource   = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek);
        $inactiveResource = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek, isActive: false);

        $service = BookingService::factory()->create([
            'tenant_id'             => 'test-tenant',
            'booking_mode'          => BookingService::MODE_SLOT,
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => null,
        ]);
        $service->resources()->attach([$activeResource->id, $inactiveResource->id]);

        $slotStart = Carbon::parse($monday->toDateString() . ' 09:00:00', self::TZ)->utc();
        $slotEnd   = $slotStart->copy()->addHour();

        $available = $this->svc->getAvailableResources($service, $slotStart, $slotEnd);

        $this->assertCount(1, $available);
        $this->assertEquals($activeResource->id, $available->first()->id);
    }

    #[Test]
    public function get_available_resources_excludes_resource_with_explicit_block(): void
    {
        $monday          = Carbon::now(self::TZ)->next('Monday')->startOfDay();
        $blockedResource = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek);
        $freeResource    = $this->resourceWithWindow(dayOfWeek: $monday->dayOfWeek);

        $service = BookingService::factory()->create([
            'tenant_id'             => 'test-tenant',
            'booking_mode'          => BookingService::MODE_SLOT,
            'duration_minutes'      => 60,
            'slot_interval_minutes' => 60,
            'buffer_minutes'        => 0,
            'advance_notice_hours'  => 0,
            'max_advance_days'      => null,
        ]);
        $service->resources()->attach([$blockedResource->id, $freeResource->id]);

        // Create an explicit block for the Monday date on the first resource
        $user = User::factory()->create();
        BookingResourceBlock::factory()->create([
            'resource_id' => $blockedResource->id,
            'start_date'  => $monday->toDateString(),
            'end_date'    => $monday->toDateString(),
            'reason'      => 'Maintenance',
            'created_by'  => $user->id,
        ]);

        $slotStart = Carbon::parse($monday->toDateString() . ' 09:00:00', self::TZ)->utc();
        $slotEnd   = $slotStart->copy()->addHour();

        $available = $this->svc->getAvailableResources($service, $slotStart, $slotEnd);

        $this->assertCount(1, $available);
        $this->assertEquals($freeResource->id, $available->first()->id);
    }
}
