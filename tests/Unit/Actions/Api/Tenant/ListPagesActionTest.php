<?php

namespace Tests\Unit\Actions\Api\Tenant;

use App\Actions\Api\Tenant\ListPagesAction;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ListPagesActionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_lists_pages_for_current_tenant()
    {
        $user = User::factory()->create();
        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();

        tenancy()->initialize($tenant1);

        // Create pages for tenant1
        $page1 = Page::create([
            'tenant_id' => $tenant1->id,
            'title' => 'Page 1',
            'slug' => 'page-1',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $page2 = Page::create([
            'tenant_id' => $tenant1->id,
            'title' => 'Page 2',
            'slug' => 'page-2',
            'page_type' => 'general',
            'status' => 'draft',
            'is_homepage' => false,
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        // Create page for tenant2 (should not be included)
        Page::create([
            'tenant_id' => $tenant2->id,
            'title' => 'Page 3',
            'slug' => 'page-3',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $action = new ListPagesAction();
        $result = $action->execute();

        $this->assertCount(2, $result);
        $this->assertEquals('Page 1', $result[0]['title']);
        $this->assertEquals('Page 2', $result[1]['title']);
    }

    #[Test]
    public function it_filters_pages_by_status()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();
        tenancy()->initialize($tenant);

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

        $action = new ListPagesAction();
        $result = $action->execute(['status' => 'published']);

        $this->assertCount(1, $result);
        $this->assertEquals('published', $result[0]['status']);
    }

    #[Test]
    public function it_filters_pages_by_page_type()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();
        tenancy()->initialize($tenant);

        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Page',
            'slug' => 'page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Template',
            'slug' => 'template',
            'page_type' => 'home',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $action = new ListPagesAction();
        $result = $action->execute(['page_type' => 'home']);

        $this->assertCount(1, $result);
        $this->assertEquals('home', $result[0]['page_type']);
    }
}
