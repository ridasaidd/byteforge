<?php

namespace Tests\Feature\Api;

use App\Models\MechanicProfile;
use App\Models\Tenant;
use Stancl\Tenancy\Database\Models\Domain;
use Tests\TestCase;

/**
 * Tests for the public mechanic marketplace search API.
 *
 * Routes under test:
 *   GET /api/mechanics/search
 *   GET /api/mechanics/{id}
 *
 * These are public (no auth required) and available on the central domain.
 */
class MechanicSearchTest extends TestCase
{
    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Create a tenant and a mechanic profile attached to it.
     *
     * @param array<string, mixed> $profileData
     */
    private function createMechanicTenant(array $profileData = []): MechanicProfile
    {
        static $counter = 0;
        $counter++;

        $tenant = Tenant::create([
            'id'   => "mechanic-test-{$counter}",
            'name' => "Test Workshop {$counter}",
            'slug' => "test-workshop-{$counter}",
        ]);
        Domain::create(['domain' => "workshop{$counter}.test", 'tenant_id' => $tenant->id]);

        return MechanicProfile::create(array_merge([
            'tenant_id'   => $tenant->id,
            'address'     => "{$counter} Main Street",
            'city'        => 'Stockholm',
            'country'     => 'Sweden',
            'latitude'    => 59.3293 + ($counter * 0.01),
            'longitude'   => 18.0686 + ($counter * 0.01),
            'phone'       => "+4670000000{$counter}",
            'description' => "We fix cars fast ({$counter}).",
            'services'    => ['oil change', 'brakes'],
            'is_active'   => true,
            'is_verified' => false,
        ], $profileData));
    }

    // =========================================================================
    // GET /api/mechanics/search
    // =========================================================================

    public function test_search_returns_200_with_empty_results(): void
    {
        $response = $this->getJson('/api/mechanics/search');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => ['total', 'per_page', 'current_page', 'last_page', 'search'],
            ]);
    }

    public function test_search_returns_active_mechanic_profiles(): void
    {
        $this->createMechanicTenant(['is_active' => true]);
        $this->createMechanicTenant(['is_active' => true]);
        // Inactive — should NOT appear
        $this->createMechanicTenant(['is_active' => false]);

        $response = $this->getJson('/api/mechanics/search');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
    }

    public function test_search_result_contains_expected_fields(): void
    {
        $this->createMechanicTenant();

        $response = $this->getJson('/api/mechanics/search');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'tenant_id',
                        'workshop_name',
                        'address',
                        'city',
                        'country',
                        'latitude',
                        'longitude',
                        'phone',
                        'services',
                        'is_verified',
                    ],
                ],
            ]);
    }

    public function test_search_filters_by_city(): void
    {
        $this->createMechanicTenant(['city' => 'Stockholm']);
        $this->createMechanicTenant(['city' => 'Gothenburg']);

        $response = $this->getJson('/api/mechanics/search?city=Stockholm');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Stockholm', $data[0]['city']);
    }

    public function test_search_city_filter_is_case_insensitive(): void
    {
        $this->createMechanicTenant(['city' => 'Stockholm']);

        $response = $this->getJson('/api/mechanics/search?city=stockholm');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_search_filters_by_service(): void
    {
        $this->createMechanicTenant(['services' => ['oil change', 'diagnostics']]);
        $this->createMechanicTenant(['services' => ['tires', 'alignment']]);

        $response = $this->getJson('/api/mechanics/search?service=diagnostics');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertContains('diagnostics', $data[0]['services']);
    }

    public function test_search_filters_verified_only(): void
    {
        $this->createMechanicTenant(['is_verified' => true]);
        $this->createMechanicTenant(['is_verified' => false]);

        $response = $this->getJson('/api/mechanics/search?verified=1');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertTrue($data[0]['is_verified']);
    }

    public function test_search_gps_returns_distance_in_results(): void
    {
        // Place a mechanic near Stockholm city center
        $this->createMechanicTenant([
            'latitude'  => 59.3293,
            'longitude' => 18.0686,
        ]);

        // Search from the same point
        $response = $this->getJson('/api/mechanics/search?lat=59.3293&lng=18.0686&radius=10');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertArrayHasKey('distance_km', $data[0]);
        $this->assertLessThan(1.0, $data[0]['distance_km']);
    }

    public function test_search_gps_excludes_mechanics_outside_radius(): void
    {
        // Inside radius (~0 km)
        $this->createMechanicTenant(['latitude' => 59.3293, 'longitude' => 18.0686]);
        // ~200 km north of Stockholm
        $this->createMechanicTenant(['latitude' => 61.0, 'longitude' => 17.0]);

        $response = $this->getJson('/api/mechanics/search?lat=59.3293&lng=18.0686&radius=50');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
    }

    public function test_search_gps_results_sorted_by_distance(): void
    {
        // Farther mechanic first in DB insert order
        $this->createMechanicTenant(['latitude' => 59.4, 'longitude' => 18.1]); // ~11 km
        $this->createMechanicTenant(['latitude' => 59.33, 'longitude' => 18.07]); // ~0.1 km

        $response = $this->getJson('/api/mechanics/search?lat=59.3293&lng=18.0686&radius=100');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        // Nearest should be first
        $this->assertLessThan($data[1]['distance_km'], $data[0]['distance_km']);
    }

    public function test_search_respects_pagination(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->createMechanicTenant();
        }

        $response = $this->getJson('/api/mechanics/search?per_page=2&page=1');

        $response->assertStatus(200);
        $meta = $response->json('meta');
        $this->assertEquals(2, $meta['per_page']);
        $this->assertEquals(1, $meta['current_page']);
        $this->assertEquals(5, $meta['total']);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_search_validates_lat_bounds(): void
    {
        $response = $this->getJson('/api/mechanics/search?lat=999&lng=18');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['lat']);
    }

    public function test_search_validates_lng_bounds(): void
    {
        $response = $this->getJson('/api/mechanics/search?lat=59&lng=999');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['lng']);
    }

    public function test_search_validates_radius_max(): void
    {
        $response = $this->getJson('/api/mechanics/search?lat=59&lng=18&radius=9999');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['radius']);
    }

    public function test_search_does_not_expose_inactive_mechanics(): void
    {
        $this->createMechanicTenant(['is_active' => false]);

        $response = $this->getJson('/api/mechanics/search');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    // =========================================================================
    // GET /api/mechanics/{id}
    // =========================================================================

    public function test_show_returns_single_mechanic(): void
    {
        $profile = $this->createMechanicTenant();

        $response = $this->getJson("/api/mechanics/{$profile->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id', 'tenant_id', 'workshop_name', 'city', 'services', 'is_verified',
                ],
            ])
            ->assertJson(['data' => ['id' => $profile->id]]);
    }

    public function test_show_returns_404_for_unknown_mechanic(): void
    {
        $response = $this->getJson('/api/mechanics/99999');

        $response->assertStatus(404);
    }

    public function test_show_returns_404_for_inactive_mechanic(): void
    {
        $profile = $this->createMechanicTenant(['is_active' => false]);

        $response = $this->getJson("/api/mechanics/{$profile->id}");

        $response->assertStatus(404);
    }

    public function test_search_requires_no_authentication(): void
    {
        // No auth token set — should still return 200
        $response = $this->getJson('/api/mechanics/search');

        $response->assertStatus(200);
    }
}
