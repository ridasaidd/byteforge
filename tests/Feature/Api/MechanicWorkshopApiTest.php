<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\MechanicWorkshop;
use App\Models\MechanicService;
use App\Models\MechanicReview;
use App\Models\MechanicBooking;
use App\Models\Tenant;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Mechanic Workshop Directory Add-on — feature tests.
 *
 * These tests cover model-level business logic for the add-on: workshop
 * creation, service management, review aggregation, location search, and
 * booking lifecycle.  HTTP-layer tests for tenant-domain routes are currently
 * skipped in the SQLite test environment (same constraint as other tenant-
 * domain API tests — see TenantAnalyticsApiTest for details).
 */
class MechanicWorkshopApiTest extends TestCase
{
    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    private function createWorkshop(array $attributes = []): MechanicWorkshop
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();

        return MechanicWorkshop::create(array_merge([
            'tenant_id'   => $tenant->id,
            'name'        => 'Quick Fix Garage',
            'slug'        => 'quick-fix-garage',
            'address'     => 'Storgatan 1',
            'city'        => 'Stockholm',
            'country'     => 'SE',
            'status'      => 'active',
            'latitude'    => 59.3293,
            'longitude'   => 18.0686,
        ], $attributes));
    }

    // =========================================================================
    // Model / business logic tests (no HTTP layer)
    // =========================================================================

    #[Test]
    public function workshop_can_be_created_and_retrieved(): void
    {
        $workshop = $this->createWorkshop();

        $this->assertDatabaseHas('mechanic_workshops', [
            'name'   => 'Quick Fix Garage',
            'city'   => 'Stockholm',
            'status' => 'active',
        ]);

        $fresh = MechanicWorkshop::find($workshop->id);
        $this->assertNotNull($fresh);
        $this->assertEquals('Quick Fix Garage', $fresh->name);
    }

    #[Test]
    public function service_can_be_added_to_workshop(): void
    {
        $workshop = $this->createWorkshop();

        $service = MechanicService::create([
            'workshop_id'      => $workshop->id,
            'name'             => 'Oil Change',
            'description'      => 'Full synthetic oil change',
            'price_min'        => 59900,
            'price_max'        => 89900,
            'currency'         => 'SEK',
            'duration_minutes' => 30,
            'is_active'        => true,
        ]);

        $this->assertDatabaseHas('mechanic_services', [
            'workshop_id' => $workshop->id,
            'name'        => 'Oil Change',
        ]);

        $this->assertCount(1, $workshop->services()->get());
        $this->assertEquals('Oil Change', $service->name);
    }

    #[Test]
    public function review_submission_recalculates_rating(): void
    {
        $workshop = $this->createWorkshop();
        $reviewer = User::factory()->create();

        MechanicReview::create([
            'workshop_id'      => $workshop->id,
            'reviewer_user_id' => $reviewer->id,
            'rating'           => 4,
            'status'           => 'published',
        ]);

        $workshop->recalculateRating();
        $workshop->refresh();

        $this->assertEquals(4.00, $workshop->rating_average);
        $this->assertEquals(1, $workshop->rating_count);

        // Add another review from a different user
        $reviewer2 = User::factory()->create();
        MechanicReview::create([
            'workshop_id'      => $workshop->id,
            'reviewer_user_id' => $reviewer2->id,
            'rating'           => 2,
            'status'           => 'published',
        ]);

        $workshop->recalculateRating();
        $workshop->refresh();

        $this->assertEquals(3.00, $workshop->rating_average);
        $this->assertEquals(2, $workshop->rating_count);
    }

    #[Test]
    public function only_published_reviews_count_towards_rating(): void
    {
        $workshop = $this->createWorkshop();
        $reviewer = User::factory()->create();
        $reviewer2 = User::factory()->create();

        MechanicReview::create([
            'workshop_id'      => $workshop->id,
            'reviewer_user_id' => $reviewer->id,
            'rating'           => 5,
            'status'           => 'published',
        ]);

        MechanicReview::create([
            'workshop_id'      => $workshop->id,
            'reviewer_user_id' => $reviewer2->id,
            'rating'           => 1,
            'status'           => 'rejected', // should not count
        ]);

        $workshop->recalculateRating();
        $workshop->refresh();

        $this->assertEquals(5.00, $workshop->rating_average);
        $this->assertEquals(1, $workshop->rating_count);
    }

    #[Test]
    public function booking_can_be_created_for_a_workshop(): void
    {
        $workshop = $this->createWorkshop();
        $customer = User::factory()->create();

        $booking = MechanicBooking::create([
            'workshop_id'      => $workshop->id,
            'customer_user_id' => $customer->id,
            'scheduled_at'     => now()->addDays(3),
            'status'           => 'pending',
        ]);

        $this->assertDatabaseHas('mechanic_bookings', [
            'workshop_id'      => $workshop->id,
            'customer_user_id' => $customer->id,
            'status'           => 'pending',
        ]);

        $this->assertEquals($workshop->id, $booking->workshop->id);
        $this->assertEquals($customer->id, $booking->customer->id);
    }

    #[Test]
    public function nearby_scope_filters_workshops_by_distance(): void
    {
        $tenant = Tenant::where('slug', 'tenant-one')->firstOrFail();

        // Stockholm city centre
        $stockholm = MechanicWorkshop::create([
            'tenant_id' => $tenant->id,
            'name'      => 'Stockholm Workshop',
            'slug'      => 'stockholm-workshop',
            'address'   => 'Storgatan 1',
            'city'      => 'Stockholm',
            'country'   => 'SE',
            'status'    => 'active',
            'latitude'  => 59.3293,
            'longitude' => 18.0686,
        ]);

        // Gothenburg (~470 km away)
        $gothenburg = MechanicWorkshop::create([
            'tenant_id' => $tenant->id,
            'name'      => 'Gothenburg Workshop',
            'slug'      => 'gothenburg-workshop',
            'address'   => 'Avenyn 1',
            'city'      => 'Gothenburg',
            'country'   => 'SE',
            'status'    => 'active',
            'latitude'  => 57.7089,
            'longitude' => 11.9746,
        ]);

        // Search within 100 km of Stockholm — should only get Stockholm
        $results = MechanicWorkshop::query()
            ->forTenant($tenant->id)
            ->active()
            ->nearby(59.3293, 18.0686, 100)
            ->get();

        $ids = $results->pluck('id')->all();
        $this->assertContains($stockholm->id, $ids);
        $this->assertNotContains($gothenburg->id, $ids);
    }

    #[Test]
    public function soft_deleted_workshop_is_excluded_from_active_scope(): void
    {
        $workshop = $this->createWorkshop(['slug' => 'deleted-workshop']);
        $workshop->delete();

        $result = MechanicWorkshop::query()
            ->forTenant($workshop->tenant_id)
            ->active()
            ->find($workshop->id);

        $this->assertNull($result);
    }

    // =========================================================================
    // HTTP-layer tests (skipped in SQLite test environment)
    // =========================================================================

    #[Test]
    public function public_search_endpoint_is_accessible_without_auth(): void
    {
        $this->markTestSkipped(
            'Tenant-domain HTTP tests skipped in SQLite/test environment. ' .
            'Business logic is covered by model-level tests above.'
        );
    }

    #[Test]
    public function workshop_owner_can_create_a_workshop(): void
    {
        $this->markTestSkipped(
            'Tenant-domain HTTP tests skipped in SQLite/test environment. ' .
            'Business logic is covered by model-level tests above.'
        );
    }

    #[Test]
    public function customer_can_submit_a_review(): void
    {
        $this->markTestSkipped(
            'Tenant-domain HTTP tests skipped in SQLite/test environment. ' .
            'Business logic is covered by model-level tests above.'
        );
    }
}
