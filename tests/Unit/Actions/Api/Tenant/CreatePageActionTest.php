<?php

namespace Tests\Unit\Actions\Api\Tenant;

use App\Actions\Api\Tenant\CreatePageAction;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CreatePageActionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_creates_a_page_with_valid_data()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();
        tenancy()->initialize($tenant);

        $action = new CreatePageAction();
        $page = $action->execute([
            'title' => 'Test Page',
            'slug' => 'test-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
        ], $user);

        $this->assertInstanceOf(Page::class, $page);
        $this->assertEquals('Test Page', $page->title);
        $this->assertEquals('test-page', $page->slug);
        $this->assertEquals('general', $page->page_type);
        $this->assertEquals('published', $page->status);
        $this->assertEquals($tenant->id, $page->tenant_id);
        $this->assertEquals($user->id, $page->created_by);
    }

    #[Test]
    public function it_sets_homepage_and_unsets_others()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();
        tenancy()->initialize($tenant);

        // Create existing homepage
        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Existing Home',
            'slug' => 'existing-home',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => true,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $action = new CreatePageAction();
        $page = $action->execute([
            'title' => 'New Home Page',
            'slug' => 'new-home-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => true,
            'sort_order' => 2,
        ], $user);

        $this->assertTrue($page->is_homepage);

        // Check that existing homepage is unset
        $existingHome = Page::where('slug', 'existing-home')->first();
        $this->assertFalse($existingHome->is_homepage);
    }

    #[Test]
    public function it_validates_required_fields()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();
        tenancy()->initialize($tenant);

        $action = new CreatePageAction();

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $action->execute([
            // Missing required fields
            'title' => 'Test Page',
        ], $user);
    }

    #[Test]
    public function it_validates_unique_slug_per_tenant()
    {
        $user = User::factory()->create();
        $tenant = Tenant::factory()->create();
        tenancy()->initialize($tenant);

        // Create existing page
        Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Existing Page',
            'slug' => 'existing-slug',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $action = new CreatePageAction();

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $action->execute([
            'title' => 'New Page',
            'slug' => 'existing-slug', // Duplicate slug
            'page_type' => 'general',
            'status' => 'published',
        ], $user);
    }
}
