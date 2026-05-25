<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAvailability;
use App\Models\BookingResource;
use App\Models\BookingService;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantGuestBookingsTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = TestUsers::tenant('tenant-one');
    }

    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        $template = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.dev.byteforge.se');
        $domain = str_replace(':tenant', $slug, $template);

        return "http://{$domain}{$path}";
    }

    private function activateBookingAddon(Tenant $tenant): void
    {
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'booking'],
            [
                'name' => 'Booking',
                'description' => 'Booking system',
                'stripe_price_id' => 'price_booking_placeholder',
                'price_monthly' => 4900,
                'currency' => 'SEK',
                'feature_flag' => 'booking',
                'is_active' => true,
                'sort_order' => 10,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null],
        );
    }

    /**
     * @return array{token: string, guest_id: int}
     */
    private function issueGuestSession(string $email, string $tenantSlug = 'tenant-one'): array
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $this->activateBookingAddon($tenant);

        $result = app(GuestMagicLinkService::class)->issue(
            $email,
            (string) $tenant->id,
            $this->tenantUrl('/guest/magic', $tenantSlug),
        );

        $response = $this->postJson($this->tenantUrl('/api/guest-auth/verify', $tenantSlug), [
            'token' => $result['plainToken'],
        ]);

        $response->assertOk();

        return [
            'token' => (string) $response->json('token'),
            'guest_id' => (int) $response->json('guest.id'),
        ];
    }

    private function makeService(string $tenantId, array $overrides = []): BookingService
    {
        return BookingService::factory()->create(array_merge([
            'tenant_id' => $tenantId,
            'booking_mode' => BookingService::MODE_SLOT,
            'duration_minutes' => 60,
            'slot_interval_minutes' => 60,
        ], $overrides));
    }

    private function makeResource(string $tenantId, array $overrides = []): BookingResource
    {
        return BookingResource::factory()->create(array_merge([
            'tenant_id' => $tenantId,
        ], $overrides));
    }

    private function makeAvailability(BookingResource $resource, array $overrides = []): void
    {
        BookingAvailability::factory()->create(array_merge([
            'resource_id' => $resource->id,
            'day_of_week' => now()->addDay()->dayOfWeek,
            'starts_at' => '00:00',
            'ends_at' => '23:59',
            'is_blocked' => false,
        ], $overrides));
    }

    #[Test]
    public function guest_sign_in_links_existing_bookings_by_email_within_current_tenant(): void
    {
        $this->activateBookingAddon($this->tenant);

        $tenantTwo = TestUsers::tenant('tenant-two');
        $this->activateBookingAddon($tenantTwo);

        $serviceOne = $this->makeService((string) $this->tenant->id);
        $resourceOne = $this->makeResource((string) $this->tenant->id);
        $serviceTwo = $this->makeService((string) $tenantTwo->id);
        $resourceTwo = $this->makeResource((string) $tenantTwo->id);

        $linkedBooking = Booking::factory()->create([
            'tenant_id' => (string) $this->tenant->id,
            'service_id' => $serviceOne->id,
            'resource_id' => $resourceOne->id,
            'customer_email' => 'portal.guest@example.com',
            'customer_name' => 'Portal Guest',
        ]);

        $otherTenantBooking = Booking::factory()->create([
            'tenant_id' => (string) $tenantTwo->id,
            'service_id' => $serviceTwo->id,
            'resource_id' => $resourceTwo->id,
            'customer_email' => 'portal.guest@example.com',
            'customer_name' => 'Portal Guest',
        ]);

        $session = $this->issueGuestSession('portal.guest@example.com');

        $linkedBooking->refresh();
        $otherTenantBooking->refresh();

        $this->assertSame($session['guest_id'], $linkedBooking->guest_user_id);
        $this->assertNull($otherTenantBooking->guest_user_id);
    }

    #[Test]
    public function authenticated_guest_booking_creation_attaches_guest_user_id_when_email_matches(): void
    {
        $this->activateBookingAddon($this->tenant);

        $service = $this->makeService((string) $this->tenant->id);
        $resource = $this->makeResource((string) $this->tenant->id);
        $service->resources()->attach($resource->id);
        $this->makeAvailability($resource);

        $session = $this->issueGuestSession('linked.guest@example.com');

        $startsAt = now()->addDay()->setTime(10, 0)->format('Y-m-d H:i:s');
        $endsAt = now()->addDay()->setTime(11, 0)->format('Y-m-d H:i:s');

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->postJson($this->tenantUrl('/api/public/booking'), [
                'service_id' => $service->id,
                'resource_id' => $resource->id,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'customer_name' => 'Linked Guest',
                'customer_email' => 'linked.guest@example.com',
            ]);

        $response->assertCreated();

        $booking = Booking::query()->latest('id')->firstOrFail();

        $this->assertSame($session['guest_id'], $booking->guest_user_id);
    }

    #[Test]
    public function authenticated_guest_can_list_only_their_linked_bookings(): void
    {
        $this->activateBookingAddon($this->tenant);

        $service = $this->makeService((string) $this->tenant->id);
        $resource = $this->makeResource((string) $this->tenant->id);

        $session = $this->issueGuestSession('list.guest@example.com');

        Booking::factory()->create([
            'tenant_id' => (string) $this->tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'guest_user_id' => $session['guest_id'],
            'customer_email' => 'list.guest@example.com',
            'customer_name' => 'List Guest',
        ]);

        Booking::factory()->create([
            'tenant_id' => (string) $this->tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'guest_user_id' => null,
            'customer_email' => 'other@example.com',
            'customer_name' => 'Other Guest',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->getJson($this->tenantUrl('/api/guest-auth/bookings'));

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('list.guest@example.com', $response->json('data.0.customer_email'));
    }

    #[Test]
    public function authenticated_guest_can_cancel_their_own_linked_booking(): void
    {
        $this->activateBookingAddon($this->tenant);

        $service = $this->makeService((string) $this->tenant->id);
        $resource = $this->makeResource((string) $this->tenant->id);
        $session = $this->issueGuestSession('cancel.guest@example.com');

        $booking = Booking::factory()->confirmed()->create([
            'tenant_id' => (string) $this->tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'guest_user_id' => $session['guest_id'],
            'customer_email' => 'cancel.guest@example.com',
            'customer_name' => 'Cancel Guest',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->patchJson($this->tenantUrl("/api/guest-auth/bookings/{$booking->id}/cancel"));

        $response->assertOk()
            ->assertJsonPath('data.status', Booking::STATUS_CANCELLED);

        $booking->refresh();
        $this->assertSame(Booking::STATUS_CANCELLED, $booking->status);
    }

    #[Test]
    public function authenticated_guest_can_reschedule_their_own_linked_booking(): void
    {
        $this->activateBookingAddon($this->tenant);

        $service = $this->makeService((string) $this->tenant->id);
        $resource = $this->makeResource((string) $this->tenant->id);
        $session = $this->issueGuestSession('reschedule.guest@example.com');

        $targetStart = now()->addDays(2)->setTime(12, 0, 0);
        $targetEnd = now()->addDays(2)->setTime(13, 0, 0);

        $this->makeAvailability($resource, [
            'day_of_week' => null,
            'specific_date' => $targetStart->toDateString(),
            'starts_at' => '08:00:00',
            'ends_at' => '20:00:00',
        ]);

        $booking = Booking::factory()->confirmed()->create([
            'tenant_id' => (string) $this->tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'guest_user_id' => $session['guest_id'],
            'customer_email' => 'reschedule.guest@example.com',
            'customer_name' => 'Reschedule Guest',
            'starts_at' => now()->addDays(2)->setTime(10, 0, 0),
            'ends_at' => now()->addDays(2)->setTime(11, 0, 0),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->patchJson($this->tenantUrl("/api/guest-auth/bookings/{$booking->id}/reschedule"), [
                'starts_at' => $targetStart->toIso8601String(),
                'ends_at' => $targetEnd->toIso8601String(),
            ]);

        $response->assertOk()
            ->assertJsonPath('data.starts_at', $targetStart->toIso8601String())
            ->assertJsonPath('data.ends_at', $targetEnd->toIso8601String())
            ->assertJsonPath('data.can_reschedule', true);

        $booking->refresh();
        $this->assertTrue($booking->starts_at->equalTo($targetStart));
        $this->assertTrue($booking->ends_at->equalTo($targetEnd));
    }

    #[Test]
    public function authenticated_guest_reschedule_rejects_an_unavailable_slot(): void
    {
        $this->activateBookingAddon($this->tenant);

        $service = $this->makeService((string) $this->tenant->id);
        $resource = $this->makeResource((string) $this->tenant->id);
        $session = $this->issueGuestSession('conflict.guest@example.com');

        $bookingDate = now()->addDays(3);
        $this->makeAvailability($resource, [
            'day_of_week' => null,
            'specific_date' => $bookingDate->toDateString(),
            'starts_at' => '09:00:00',
            'ends_at' => '10:00:00',
        ]);

        $booking = Booking::factory()->confirmed()->create([
            'tenant_id' => (string) $this->tenant->id,
            'service_id' => $service->id,
            'resource_id' => $resource->id,
            'guest_user_id' => $session['guest_id'],
            'customer_email' => 'conflict.guest@example.com',
            'customer_name' => 'Conflict Guest',
            'starts_at' => $bookingDate->copy()->setTime(9, 0, 0),
            'ends_at' => $bookingDate->copy()->setTime(10, 0, 0),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$session['token'])
            ->patchJson($this->tenantUrl("/api/guest-auth/bookings/{$booking->id}/reschedule"), [
                'starts_at' => $bookingDate->copy()->setTime(18, 0, 0)->toIso8601String(),
                'ends_at' => $bookingDate->copy()->setTime(19, 0, 0)->toIso8601String(),
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('message', 'The requested time slot is not available.');

        $booking->refresh();
        $this->assertSame('09:00:00', $booking->starts_at->format('H:i:s'));
        $this->assertSame('10:00:00', $booking->ends_at->format('H:i:s'));
    }
}
