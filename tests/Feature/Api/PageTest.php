<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class PageTest extends TestCase
{
    use RefreshDatabase, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function authenticated_user_can_list_pages()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        $tokenResult = $user->createToken('test-token');

        tenancy()->initialize($tenant);
        // Create tenant domain and use it when calling routes
        $domain = 'tenant-pages-test.example.com';
        $tenant->domains()->create(['domain' => $domain]);

        // Create some pages for this tenant
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

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
        ])->getJson("https://{$domain}/api/pages");

        $response->assertStatus(200)
                ->assertJsonCount(2);
    }

    #[Test]
    public function authenticated_user_can_filter_pages_by_status()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        $tokenResult = $user->createToken('test-token');

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-test2.example.com';
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

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
        ])->getJson("https://{$domain}/api/pages?status=published");

        $response->assertStatus(200)
                ->assertJsonCount(1)
                ->assertJsonFragment(['title' => 'Published Page']);
    }

    #[Test]
    public function authenticated_user_can_create_page()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        $tokenResult = $user->createToken('test-token');

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-test3.example.com';
        $tenant->domains()->create(['domain' => $domain]);

        $pageData = [
            'title' => 'New Test Page',
            'slug' => 'new-test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
        ])->postJson("https://{$domain}/api/pages", $pageData);

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
        $tokenResult = $user->createToken('test-token');

        tenancy()->initialize($tenant);
        $domain = 'tenant-pages-test4.example.com';
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

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
        ])->getJson("https://{$domain}/api/pages/{$page->id}");

        $response->assertStatus(200)
                ->assertJsonFragment(['title' => 'Test Page']);
    }

    #[Test]
    public function user_cannot_view_page_from_different_tenant()
    {
        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();
        $user = User::factory()->create();
        $tokenResult = $user->createToken('test-token');

        tenancy()->initialize($tenant1);
        $domain = 'tenant-pages-test5.example.com';
        $tenant1->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant2->id, // Different tenant
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
        ])->getJson("https://{$domain}/api/pages/{$page->id}");

        $response->assertStatus(404);
    }

    #[Test]
    public function unauthenticated_user_cannot_access_page_endpoints()
    {
        // Tenant routes require tenant domain
        $tenant = Tenant::factory()->create();
        $domain = 'tenant-pages-test6.example.com';
        $tenant->domains()->create(['domain' => $domain]);
        tenancy()->initialize($tenant);

        $response = $this->getJson("https://{$domain}/api/pages");

        $response->assertStatus(401);
    }
}
