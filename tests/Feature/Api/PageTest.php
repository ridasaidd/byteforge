<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    }

    #[Test]
    public function authenticated_user_can_list_pages()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-list.test';
        $tenant->domains()->create(['domain' => $domain]);

        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page 1',
            'slug' => 'test-page-1',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page 2',
            'slug' => 'test-page-2',
            'page_type' => 'general',
            'status' => 'draft',
            'is_homepage' => false,
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/pages");

        $response->assertStatus(200)
            ->assertJsonCount(2);
    }

    #[Test]
    public function authenticated_user_can_filter_pages_by_status()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-filter.test';
        $tenant->domains()->create(['domain' => $domain]);

        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Published Page',
            'slug' => 'published-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Draft Page',
            'slug' => 'draft-page',
            'page_type' => 'general',
            'status' => 'draft',
            'is_homepage' => false,
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/pages?status=published");

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'Published Page']);
    }

    #[Test]
    public function authenticated_user_can_create_page()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-create.test';
        $tenant->domains()->create(['domain' => $domain]);

        $pageData = [
            'title' => 'New Test Page',
            'slug' => 'new-test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
        ];

        $response = $this->postJson("https://{$domain}/api/pages", $pageData);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'title' => 'New Test Page',
                'slug' => 'new-test-page',
                'status' => 'published',
            ]);

        $this->assertDatabaseHas('pages', [
            'tenant_id' => $tenant->id,
            'title' => 'New Test Page',
            'slug' => 'new-test-page',
        ]);
    }

    #[Test]
    public function authenticated_user_can_view_page()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-view.test';
        $tenant->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/pages/{$page->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['title' => 'Test Page']);
    }

    #[Test]
    public function authenticated_user_can_update_page()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-update.test';
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

        $updatedData = [
            'title' => 'Updated Title',
            'status' => 'published',
        ];

        $response = $this->putJson("https://{$domain}/api/pages/{$page->id}", $updatedData);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'title' => 'Updated Title',
                'status' => 'published',
                'slug' => 'original-slug',
            ]);

        $this->assertDatabaseHas('pages', [
            'id' => $page->id,
            'title' => 'Updated Title',
            'status' => 'published',
        ]);
    }

    #[Test]
    public function authenticated_user_can_delete_page()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-delete.test';
        $tenant->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Page to Delete',
            'slug' => 'page-to-delete',
            'page_type' => 'general',
            'status' => 'draft',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->deleteJson("https://{$domain}/api/pages/{$page->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Page deleted successfully']);

        $this->assertDatabaseMissing('pages', [
            'id' => $page->id,
        ]);
    }

    #[Test]
    public function user_cannot_view_page_from_different_tenant()
    {
        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant1);
        $domain = 'tenant-pages-isolation.test';
        $tenant1->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant2->id,
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->getJson("https://{$domain}/api/pages/{$page->id}");

        $response->assertStatus(404);
    }
}
