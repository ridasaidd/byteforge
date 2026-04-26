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
        return "http://{$slug}.byteforge.se{$path}";
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

    private function makeAvailability(BookingResource $resource): void
    {
        BookingAvailability::factory()->create([
            'resource_id' => $resource->id,
            'day_of_week' => now()->addDay()->dayOfWeek,
            'starts_at' => '00:00',
            'ends_at' => '23:59',
            'is_blocked' => false,
        ]);
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
}
