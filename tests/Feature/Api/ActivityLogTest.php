<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    }

    #[Test]
    public function page_creation_is_logged()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        
        // Grant permissions in tenant context
        $user->givePermissionTo('pages.create');
        
        $domain = 'tenant-activity-test.test';
        $tenant->domains()->create(['domain' => $domain]);

        $pageData = [
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
        ];

        $response = $this->postJson("https://{$domain}/api/pages", $pageData);

        $response->assertStatus(201); // Assert successful creation first

        $this->assertDatabaseHas('activity_log', [
            'tenant_id' => $tenant->id,
            'subject_type' => Page::class,
            'event' => 'created',
            'causer_id' => $user->id,
        ]);
    }

    #[Test]
    public function page_update_is_logged()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        
        // Grant permissions in tenant context
        $user->givePermissionTo(['pages.create', 'pages.edit']);
        
        $domain = 'tenant-activity-update.test';
        $tenant->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Original Title',
            'slug' => 'original-slug',
            'page_type' => 'general',
            'status' => 'draft',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $this->putJson("https://{$domain}/api/pages/{$page->id}", [
            'title' => 'Updated Title',
        ]);

        $this->assertDatabaseHas('activity_log', [
            'tenant_id' => $tenant->id,
            'subject_type' => Page::class,
            'subject_id' => $page->id,
            'event' => 'updated',
        ]);
    }

    #[Test]
    public function authenticated_user_can_view_activity_logs()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        
        // Grant permissions in tenant context
        $user->givePermissionTo(['pages.create', 'view activity logs']);
        
        $domain = 'tenant-activity-view.test';
        $tenant->domains()->create(['domain' => $domain]);

        // Create some activity
        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/activity-logs");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'description', 'event', 'subject_type', 'created_at'],
                ],
                'meta',
            ]);
    }

    #[Test]
    public function activity_logs_can_be_filtered_by_subject_type()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        
        // Grant permissions in tenant context
        $user->givePermissionTo(['pages.create', 'view activity logs']);
        
        $domain = 'tenant-activity-filter.test';
        $tenant->domains()->create(['domain' => $domain]);

        // Create a page
        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/activity-logs?subject_type=pages");

        $response->assertStatus(200);

        $data = $response->json('data');
        foreach ($data as $activity) {
            $this->assertEquals('Page', $activity['subject_type']);
        }
    }
}
