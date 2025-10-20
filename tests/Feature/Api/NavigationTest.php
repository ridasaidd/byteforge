<?php

namespace Tests\Feature\Api;

use App\Models\Navigation;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NavigationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    }

    #[Test]
    public function authenticated_user_can_list_navigations()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-navigations-list.test';
        $tenant->domains()->create(['domain' => $domain]);

        Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Main Menu',
            'slug' => 'main-menu',
            'structure' => [],
            'status' => 'published',
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Footer Menu',
            'slug' => 'footer-menu',
            'structure' => [],
            'status' => 'draft',
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/navigations");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'structure', 'status'],
                ],
            ])
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function authenticated_user_can_filter_navigations_by_status()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-navigations-filter.test';
        $tenant->domains()->create(['domain' => $domain]);

        Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Published Menu',
            'slug' => 'published-menu',
            'structure' => [],
            'status' => 'published',
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Draft Menu',
            'slug' => 'draft-menu',
            'structure' => [],
            'status' => 'draft',
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/navigations?status=published");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['name' => 'Published Menu']);
    }

    #[Test]
    public function authenticated_user_can_create_navigation()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-navigations-create.test';
        $tenant->domains()->create(['domain' => $domain]);

        $navigationData = [
            'name' => 'Main Menu',
            'slug' => 'main-menu',
            'structure' => [
                ['label' => 'Home', 'url' => '/'],
                ['label' => 'About', 'url' => '/about'],
            ],
            'status' => 'published',
            'sort_order' => 1,
        ];

        $response = $this->postJson("https://{$domain}/api/navigations", $navigationData);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'message' => 'Navigation created successfully',
            ]);

        $this->assertDatabaseHas('navigations', [
            'tenant_id' => $tenant->id,
            'name' => 'Main Menu',
            'slug' => 'main-menu',
        ]);
    }

    #[Test]
    public function authenticated_user_can_view_navigation()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-navigations-view.test';
        $tenant->domains()->create(['domain' => $domain]);

        $navigation = Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Test Menu',
            'slug' => 'test-menu',
            'structure' => [],
            'status' => 'published',
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/navigations/{$navigation->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'Test Menu']);
    }

    #[Test]
    public function authenticated_user_can_update_navigation()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-navigations-update.test';
        $tenant->domains()->create(['domain' => $domain]);

        $navigation = Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Original Name',
            'slug' => 'original-slug',
            'structure' => [],
            'status' => 'draft',
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $updatedData = [
            'name' => 'Updated Name',
            'status' => 'published',
        ];

        $response = $this->putJson("https://{$domain}/api/navigations/{$navigation->id}", $updatedData);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Navigation updated successfully',
            ]);

        $this->assertDatabaseHas('navigations', [
            'id' => $navigation->id,
            'name' => 'Updated Name',
            'status' => 'published',
        ]);
    }

    #[Test]
    public function authenticated_user_can_delete_navigation()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-navigations-delete.test';
        $tenant->domains()->create(['domain' => $domain]);

        $navigation = Navigation::create([
            'tenant_id' => $tenant->id,
            'name' => 'Menu to Delete',
            'slug' => 'menu-to-delete',
            'structure' => [],
            'status' => 'draft',
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->deleteJson("https://{$domain}/api/navigations/{$navigation->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Navigation deleted successfully']);

        $this->assertDatabaseMissing('navigations', [
            'id' => $navigation->id,
        ]);
    }

    #[Test]
    public function user_cannot_view_navigation_from_different_tenant()
    {
        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant1);
        $domain = 'tenant-navigations-isolation.test';
        $tenant1->domains()->create(['domain' => $domain]);

        $navigation = Navigation::create([
            'tenant_id' => $tenant2->id,
            'name' => 'Test Menu',
            'slug' => 'test-menu',
            'structure' => [],
            'status' => 'published',
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/navigations/{$navigation->id}");

        $response->assertStatus(404);
    }
}
