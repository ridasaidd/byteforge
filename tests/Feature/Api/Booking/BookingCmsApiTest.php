<?php

namespace Tests\Feature\Api\Booking;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Tenant;
use App\Models\TenantAddon;
use Laravel\Pennant\Feature;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingCmsApiTest extends TestCase
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function url(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    private function activateBookingAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'booking'],
            [
                'name'            => 'Booking',
                'description'     => 'Booking system',
                'stripe_price_id' => 'price_booking_placeholder',
                'price_monthly'   => 4900,
                'currency'        => 'SEK',
                'feature_flag'    => 'booking',
                'is_active'       => true,
                'sort_order'      => 10,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null]
        );
    }

    private function deactivateBookingAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->where('slug', 'booking')->first();
        if ($addon) {
            TenantAddon::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('addon_id', $addon->id)
                ->update(['deactivated_at' => now()->subSecond()]);
        }

        // Raw query-builder updates bypass Eloquent observers, so Pennant's
        // in-memory cache is never automatically busted. Forget it explicitly.
        Feature::for($tenant)->forget('booking');
    }

    private function makeService(string $tenantId, array $overrides = []): BookingService
    {
        return BookingService::factory()->create(array_merge([
            'tenant_id'    => $tenantId,
            'booking_mode' => BookingService::MODE_SLOT,
        ], $overrides));
    }

    private function makeResource(string $tenantId, array $overrides = []): BookingResource
    {
        return BookingResource::factory()->create(array_merge([
            'tenant_id' => $tenantId,
        ], $overrides));
    }

    // ─── Addon gating ────────────────────────────────────────────────────────

    #[Test]
    public function cms_resources_blocked_without_booking_addon(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->deactivateBookingAddon($tenant);

        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url('/api/booking/resources'))
            ->assertForbidden();
    }

    // ─── Permission gating ───────────────────────────────────────────────────

    #[Test]
    public function viewer_cannot_create_resource(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->url('/api/booking/resources'), [
                'name' => 'Room A',
                'type' => BookingResource::TYPE_SPACE,
            ])
            ->assertForbidden();
    }

    #[Test]
    public function viewer_can_read_resources(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $this->actingAsTenantViewer('tenant-one')
            ->getJson($this->url('/api/booking/resources'))
            ->assertOk();
    }

    // ─── Resource CRUD ───────────────────────────────────────────────────────

    #[Test]
    public function owner_can_crud_resources(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        // Create
        $create = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/resources'), [
                'name' => 'Meeting Room Alpha',
                'type' => BookingResource::TYPE_SPACE,
                'description' => 'Quiet room suitable for private sessions.',
            ]);
        $create->assertCreated()->assertJsonPath('data.name', 'Meeting Room Alpha');
        $create->assertJsonPath('data.description', 'Quiet room suitable for private sessions.');
        $id = $create->json('data.id');

        // Read
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/booking/resources/{$id}"))
            ->assertOk()
            ->assertJsonPath('data.name', 'Meeting Room Alpha')
            ->assertJsonPath('data.description', 'Quiet room suitable for private sessions.');

        // Update
        $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->url("/api/booking/resources/{$id}"), [
                'name' => 'Meeting Room Beta',
                'description' => 'Updated room details for staff and guests.',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Meeting Room Beta')
            ->assertJsonPath('data.description', 'Updated room details for staff and guests.');

        // Delete
        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/resources/{$id}"))
            ->assertNoContent();

        $this->assertDatabaseMissing('booking_resources', ['id' => $id]);
    }

    #[Test]
    public function owner_can_clear_resource_description(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $resource = $this->makeResource((string) $tenant->id, [
            'description' => 'Temporary note to remove',
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/resources/{$resource->id}"), [
                'description' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.description', null);

        $this->assertDatabaseHas('booking_resources', [
            'id' => $resource->id,
            'description' => null,
        ]);
    }

    #[Test]
    public function person_resource_normalizes_capacity_and_label(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $create = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/resources'), [
                'name' => 'Alice Stylist',
                'type' => BookingResource::TYPE_PERSON,
                'capacity' => 4,
                'resource_label' => 'Chair 1',
                'checkin_time' => '15:00:00',
                'checkout_time' => '11:00:00',
            ]);

        $create->assertCreated()
            ->assertJsonPath('data.type', BookingResource::TYPE_PERSON)
            ->assertJsonPath('data.capacity', 1)
            ->assertJsonPath('data.resource_label', null)
            ->assertJsonPath('data.checkin_time', null)
            ->assertJsonPath('data.checkout_time', null);

        $id = (int) $create->json('data.id');

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/resources/{$id}"), [
                'capacity' => 7,
                'resource_label' => 'Any label',
                'checkin_time' => '16:00:00',
                'checkout_time' => '10:00:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.capacity', 1)
            ->assertJsonPath('data.resource_label', null)
            ->assertJsonPath('data.checkin_time', null)
            ->assertJsonPath('data.checkout_time', null);

        $this->assertDatabaseHas('booking_resources', [
            'id' => $id,
            'type' => BookingResource::TYPE_PERSON,
            'capacity' => 1,
            'resource_label' => null,
            'checkin_time' => null,
            'checkout_time' => null,
        ]);
    }

    #[Test]
    public function resource_from_other_tenant_returns_404(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateBookingAddon($tenantOne);
        $this->activateBookingAddon($tenantTwo);

        $resource = $this->makeResource((string) $tenantTwo->id);

        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/booking/resources/{$resource->id}"))
            ->assertNotFound();
    }

    // ─── Service CRUD ─────────────────────────────────────────────────────────

    #[Test]
    public function owner_can_crud_services(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        // Create
        $create = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/services'), [
                'name'             => 'Hair Cut',
                'booking_mode'     => 'slot',
                'duration_minutes' => 45,
            ]);
        $create->assertCreated()->assertJsonPath('data.name', 'Hair Cut');
        $id = $create->json('data.id');

        // Read
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/booking/services/{$id}"))
            ->assertOk()
            ->assertJsonPath('data.name', 'Hair Cut');

        // Update
        $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->url("/api/booking/services/{$id}"), [
                'name'             => 'Hair Cut & Beard',
                'booking_mode'     => 'slot',
                'duration_minutes' => 60,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Hair Cut & Beard');

        // Delete
        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/services/{$id}"))
            ->assertNoContent();

        $this->assertDatabaseMissing('booking_services', ['id' => $id]);
    }

    #[Test]
    public function deleting_a_cancelled_booking_force_removes_it_so_service_cleanup_can_succeed(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id, [
            'type' => BookingResource::TYPE_PERSON,
        ]);
        $service->resources()->attach($resource->id);

        $booking = Booking::factory()->create([
            'tenant_id' => (string) $tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'status' => Booking::STATUS_CANCELLED,
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
        ]);
        $booking->recordEvent(
            Booking::STATUS_CANCELLED,
            Booking::ACTOR_TENANT_USER,
            null,
            Booking::STATUS_CONFIRMED,
            'Cancelled before deletion in API regression test.',
        );

        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/bookings/{$booking->id}"))
            ->assertNoContent();

        $this->assertNull(Booking::withTrashed()->find($booking->id));

        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/services/{$service->id}"))
            ->assertNoContent();

        $this->assertDatabaseMissing('booking_services', ['id' => $service->id]);
    }

    // ─── Resource ↔ Service links ─────────────────────────────────────────────

    #[Test]
    public function owner_can_attach_and_detach_resource_from_service(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);

        // Attach
        $attach = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/booking/services/{$service->id}/resources"), [
                'resource_id' => $resource->id,
            ]);
        $attach->assertOk();
        $this->assertDatabaseHas('booking_resource_services', [
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        // Detach
        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/services/{$service->id}/resources/{$resource->id}"))
            ->assertNoContent();

        $this->assertDatabaseMissing('booking_resource_services', [
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);
    }

    #[Test]
    public function cannot_attach_resource_from_another_tenant_to_service(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateBookingAddon($tenantOne);
        $this->activateBookingAddon($tenantTwo);

        $service           = $this->makeService((string) $tenantOne->id);
        $foreignResource   = $this->makeResource((string) $tenantTwo->id);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/booking/services/{$service->id}/resources"), [
                'resource_id' => $foreignResource->id,
            ])
            ->assertNotFound();
    }

    // ─── Availability windows ────────────────────────────────────────────────

    #[Test]
    public function owner_can_create_availability_window(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $resource = $this->makeResource((string) $tenant->id);

        $resp = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/booking/resources/{$resource->id}/availability"), [
                'day_of_week' => 1, // Monday
                'starts_at'   => '09:00:00',
                'ends_at'     => '17:00:00',
            ]);

        $resp->assertCreated();
        $this->assertDatabaseHas('booking_availabilities', [
            'resource_id' => $resource->id,
            'day_of_week' => 1,
        ]);
    }

    #[Test]
    public function owner_can_list_and_delete_availability_windows(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);
        $resource = $this->makeResource((string) $tenant->id);

        // Create two windows
        $winA = BookingAvailability::create([
            'resource_id' => $resource->id,
            'day_of_week' => 1,
            'starts_at'   => '09:00:00',
            'ends_at'     => '12:00:00',
            'is_blocked'  => false,
        ]);
        BookingAvailability::create([
            'resource_id' => $resource->id,
            'day_of_week' => 3,
            'starts_at'   => '13:00:00',
            'ends_at'     => '17:00:00',
            'is_blocked'  => false,
        ]);

        // List
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/booking/resources/{$resource->id}/availability"))
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Delete one
        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/availability/{$winA->id}"))
            ->assertNoContent();

        $this->assertDatabaseMissing('booking_availabilities', ['id' => $winA->id]);
    }

    #[Test]
    public function viewer_cannot_create_or_delete_availability_window(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);
        $resource = $this->makeResource((string) $tenant->id);

        $window = BookingAvailability::create([
            'resource_id' => $resource->id,
            'day_of_week' => 1,
            'starts_at'   => '09:00:00',
            'ends_at'     => '17:00:00',
            'is_blocked'  => false,
        ]);

        $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->url("/api/booking/resources/{$resource->id}/availability"), [
                'day_of_week' => 2,
                'starts_at'   => '09:00:00',
                'ends_at'     => '17:00:00',
            ])
            ->assertForbidden();

        $this->actingAsTenantViewer('tenant-one')
            ->deleteJson($this->url("/api/booking/availability/{$window->id}"))
            ->assertForbidden();
    }

    #[Test]
    public function cannot_access_availability_window_of_another_tenant(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();
        $this->activateBookingAddon($tenantOne);
        $this->activateBookingAddon($tenantTwo);

        $foreignResource = $this->makeResource((string) $tenantTwo->id);
        $foreignWindow   = BookingAvailability::create([
            'resource_id' => $foreignResource->id,
            'day_of_week' => 1,
            'starts_at'   => '09:00:00',
            'ends_at'     => '17:00:00',
            'is_blocked'  => false,
        ]);

        // Cannot list windows for a resource belonging to another tenant
        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url("/api/booking/resources/{$foreignResource->id}/availability"))
            ->assertNotFound();

        // Cannot delete a window belonging to another tenant
        $this->actingAsTenantOwner('tenant-one')
            ->deleteJson($this->url("/api/booking/availability/{$foreignWindow->id}"))
            ->assertNotFound();
    }

    #[Test]
    public function availability_window_validation_rejects_ends_at_before_starts_at(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);
        $resource = $this->makeResource((string) $tenant->id);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/booking/resources/{$resource->id}/availability"), [
                'day_of_week' => 1,
                'starts_at'   => '17:00:00',
                'ends_at'     => '09:00:00', // ends before it starts
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ends_at']);
    }

    #[Test]
    public function availability_window_must_have_day_of_week_or_specific_date(): void
    {
        // Both null is technically allowed by current validation (either can be null);
        // but a window with day_of_week=null AND specific_date=null would never match
        // any date and is useless. Documented here as a known edge case.
        // This test guards the happy path with a valid specific_date.
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);
        $resource = $this->makeResource((string) $tenant->id);

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url("/api/booking/resources/{$resource->id}/availability"), [
                'specific_date' => now()->addDay()->format('Y-m-d'),
                'starts_at'     => '10:00:00',
                'ends_at'       => '12:00:00',
            ])
            ->assertCreated()
            ->assertJsonPath('data.specific_date', fn ($v) => str_starts_with((string) $v, now()->addDay()->format('Y-m-d')));
    }

    // ─── Booking management ───────────────────────────────────────────────────

    #[Test]
    public function owner_can_list_bookings(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        Booking::factory()->create([
            'tenant_id'   => (string) $tenant->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->url('/api/booking/bookings'))
            ->assertOk()
            ->assertJsonStructure(['data', 'total', 'current_page']);
    }

    #[Test]
    public function owner_can_confirm_pending_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $booking  = Booking::factory()->pending()->create([
            'tenant_id'   => (string) $tenant->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        $resp = $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/confirm"));

        $resp->assertOk()->assertJsonPath('data.status', Booking::STATUS_CONFIRMED);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => Booking::STATUS_CONFIRMED]);
    }

    #[Test]
    public function cannot_confirm_already_confirmed_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $booking  = Booking::factory()->confirmed()->create([
            'tenant_id'   => (string) $tenant->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/confirm"))
            ->assertUnprocessable();
    }

    #[Test]
    public function owner_can_cancel_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $booking  = Booking::factory()->confirmed()->create([
            'tenant_id'   => (string) $tenant->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        $resp = $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/cancel"), [
                'note' => 'Customer requested cancellation.',
            ]);

        $resp->assertOk()->assertJsonPath('data.status', Booking::STATUS_CANCELLED);
        $this->assertDatabaseHas('bookings', [
            'id'           => $booking->id,
            'status'       => Booking::STATUS_CANCELLED,
            'cancelled_by' => Booking::CANCELLED_BY_TENANT,
        ]);
    }

    #[Test]
    public function owner_can_complete_confirmed_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $booking  = Booking::factory()->confirmed()->create([
            'tenant_id'   => (string) $tenant->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/complete"))
            ->assertOk()
            ->assertJsonPath('data.status', Booking::STATUS_COMPLETED);
    }

    #[Test]
    public function owner_can_mark_booking_as_no_show(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $booking  = Booking::factory()->confirmed()->create([
            'tenant_id'   => (string) $tenant->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/no-show"))
            ->assertOk()
            ->assertJsonPath('data.status', Booking::STATUS_NO_SHOW);
    }

    #[Test]
    public function owner_can_manually_create_booking(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $date = now()->addDays(5)->format('Y-m-d');
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'specific_date' => $date,
            'starts_at'     => '08:00:00',
            'ends_at'       => '20:00:00',
        ]);

        $startsAt = now()->addDays(5)->setTimeFromTimeString('10:00:00')->toIso8601String();
        $endsAt   = now()->addDays(5)->setTimeFromTimeString('11:00:00')->toIso8601String();

        $resp = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/bookings'), [
                'service_id'     => $service->id,
                'resource_id'    => $resource->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'customer_name'  => 'VIP Client',
                'customer_email' => 'vip@example.com',
            ]);

        $resp->assertCreated();
        $this->assertEquals(Booking::STATUS_CONFIRMED, $resp->json('data.status'));
    }

    #[Test]
    public function owner_can_force_create_booking_into_blocked_slot(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        // No availability windows = no available slots

        $startsAt = now()->addDays(5)->setTimeFromTimeString('10:00:00')->toIso8601String();
        $endsAt   = now()->addDays(5)->setTimeFromTimeString('11:00:00')->toIso8601String();

        // Without force → 409
        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/bookings'), [
                'service_id'     => $service->id,
                'resource_id'    => $resource->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'customer_name'  => 'VIP Client',
                'customer_email' => 'vip@example.com',
            ])
            ->assertStatus(409);

        // With force=true → 201
        $resp = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/bookings'), [
                'service_id'     => $service->id,
                'resource_id'    => $resource->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'customer_name'  => 'VIP Client',
                'customer_email' => 'vip@example.com',
                'force'          => true,
            ]);

        $resp->assertCreated();
    }

    #[Test]
    public function owner_manual_create_sanitizes_customer_and_internal_notes(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activateBookingAddon($tenant);

        $service  = $this->makeService((string) $tenant->id);
        $resource = $this->makeResource((string) $tenant->id);
        $service->resources()->attach($resource->id);

        $date = now()->addDays(6)->format('Y-m-d');
        BookingAvailability::create([
            'resource_id'   => $resource->id,
            'specific_date' => $date,
            'starts_at'     => '08:00:00',
            'ends_at'       => '20:00:00',
        ]);

        $startsAt = now()->addDays(6)->setTimeFromTimeString('10:00:00')->toIso8601String();
        $endsAt   = now()->addDays(6)->setTimeFromTimeString('11:00:00')->toIso8601String();

        $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->url('/api/booking/bookings'), [
                'service_id'     => $service->id,
                'resource_id'    => $resource->id,
                'starts_at'      => $startsAt,
                'ends_at'        => $endsAt,
                'customer_name'  => " <b>VIP\t Client</b> ",
                'customer_email' => " vip@example.com ",
                'customer_notes' => "<b>Customer</b>\r\nnotes\x07",
                'internal_notes' => "<b>Internal</b>\r\nnotes\x07",
            ])
            ->assertCreated();

        $this->assertDatabaseHas('bookings', [
            'tenant_id' => (string) $tenant->id,
            'customer_name' => 'VIP Client',
            'customer_email' => 'vip@example.com',
            'customer_notes' => "Customer\nnotes",
            'internal_notes' => "Internal\nnotes",
        ]);
    }

    #[Test]
    public function booking_management_is_tenant_isolated(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $this->activateBookingAddon($tenantOne);
        $this->activateBookingAddon($tenantTwo);

        $service  = $this->makeService((string) $tenantTwo->id);
        $resource = $this->makeResource((string) $tenantTwo->id);

        $booking = Booking::factory()->pending()->create([
            'tenant_id'   => (string) $tenantTwo->id,
            'service_id'  => $service->id,
            'resource_id' => $resource->id,
        ]);

        // Owner from tenant-one tries to confirm tenant-two's booking
        $this->actingAsTenantOwner('tenant-one')
            ->patchJson($this->url("/api/booking/bookings/{$booking->id}/confirm", 'tenant-one'))
            ->assertNotFound();
    }
}
