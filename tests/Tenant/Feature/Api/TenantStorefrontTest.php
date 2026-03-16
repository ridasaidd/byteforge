<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\AnalyticsEvent;
use App\Models\Navigation;
use App\Models\Page;
use App\Models\Theme;
use App\Services\PuckCompilerService;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantStorefrontTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    private function createActiveTenantTheme(string $tenantSlug = 'tenant-one'): Theme
    {
        $tenant = TestUsers::tenant($tenantSlug);

        Theme::query()
            ->where('tenant_id', $tenant->id)
            ->update(['is_active' => false]);

        return Theme::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Tenant Runtime Theme',
            'slug' => 'tenant-runtime-theme',
            'is_active' => true,
            'theme_data' => [
                'colors' => [
                    'primary' => ['500' => '#123456'],
                ],
                'typography' => [
                    'fontSize' => ['base' => '1rem'],
                ],
            ],
        ]);
    }

    private function createTenantPage(string $tenantSlug, array $attributes = []): Page
    {
        $tenant = TestUsers::tenant($tenantSlug);

        return Page::factory()->create(array_merge([
            'tenant_id' => $tenant->id,
            'title' => 'Tenant Storefront Page',
            'slug' => 'tenant-storefront-page',
            'status' => 'published',
            'page_type' => 'general',
            'puck_data' => ['content' => []],
            'puck_data_compiled' => ['content' => []],
            'page_css' => '.tenant-storefront-page { color: #123456; }',
            'is_homepage' => false,
        ], $attributes));
    }

    #[Test]
    public function tenant_homepage_serves_public_tenant_shell(): void
    {
        $this->createActiveTenantTheme('tenant-one');

        $response = $this->get($this->tenantUrl('/', 'tenant-one'));

        $response->assertOk();
        $response->assertSee('id="public-app"', false);
        $response->assertSee('resources/js/public.tsx', false);
    }

    #[Test]
    public function tenant_slug_route_serves_public_tenant_shell(): void
    {
        $this->createActiveTenantTheme('tenant-one');

        $response = $this->get($this->tenantUrl('/pages/about-us', 'tenant-one'));

        $response->assertOk();
        $response->assertSee('id="public-app"', false);
        $response->assertSee('resources/js/public.tsx', false);
    }

    #[Test]
    public function public_theme_endpoint_returns_tenant_active_theme(): void
    {
        $theme = $this->createActiveTenantTheme('tenant-one');

        $response = $this->getJson($this->tenantUrl('/api/themes/public', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('slug', $theme->slug);
        $response->assertJsonPath('name', $theme->name);
        $response->assertJsonPath('data.colors.primary.500', '#123456');
    }

    #[Test]
    public function homepage_endpoint_returns_tenant_homepage_data(): void
    {
        $this->createTenantPage('tenant-one', [
            'title' => 'Tenant Homepage',
            'slug' => 'home',
            'is_homepage' => true,
        ]);

        $response = $this->getJson($this->tenantUrl('/api/pages/public/homepage', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('data.title', 'Tenant Homepage');
        $response->assertJsonPath('data.is_homepage', true);
    }

    #[Test]
    public function slug_endpoint_returns_tenant_scoped_published_page(): void
    {
        $page = $this->createTenantPage('tenant-one', [
            'title' => 'Services',
            'slug' => 'services',
        ]);

        $response = $this->getJson($this->tenantUrl('/api/pages/public/services', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('data.id', $page->id);
        $response->assertJsonPath('data.slug', 'services');
    }

    #[Test]
    public function merged_css_endpoint_returns_tenant_published_page_css(): void
    {
        $this->createTenantPage('tenant-one', [
            'slug' => 'css-page',
            'page_css' => '.tenant-css-check { color: #abcdef; }',
        ]);

        $response = $this->get($this->tenantUrl('/api/pages/css/merged', 'tenant-one'));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/css; charset=UTF-8');
        $response->assertSee('.tenant-css-check { color: #abcdef; }', false);
    }

    #[Test]
    public function analytics_track_stores_event_with_current_tenant_id(): void
    {
        $tenant = TestUsers::tenant('tenant-one');

        $response = $this->postJson($this->tenantUrl('/api/analytics/track', 'tenant-one'), [
            'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED,
            'properties' => [
                'slug' => 'landing-page',
                'title' => 'Landing Page',
            ],
        ]);

        $response->assertNoContent();

        $event = AnalyticsEvent::query()
            ->where('tenant_id', $tenant->id)
            ->where('event_type', AnalyticsEvent::TYPE_PAGE_VIEWED)
            ->latest('id')
            ->first();

        $this->assertNotNull($event);
        $this->assertSame('landing-page', $event->properties['slug'] ?? null);
    }

    #[Test]
    public function tenant_public_page_endpoint_does_not_leak_other_tenant_page(): void
    {
        $this->createTenantPage('tenant-two', [
            'title' => 'Tenant Two Private Page',
            'slug' => 'tenant-two-page',
        ]);

        $response = $this->getJson($this->tenantUrl('/api/pages/public/tenant-two-page', 'tenant-one'));

        $response->assertNotFound();
    }

    #[Test]
    public function public_page_payload_contains_tenant_scoped_navigation_metadata(): void
    {
        $tenantOne = TestUsers::tenant('tenant-one');
        $tenantTwo = TestUsers::tenant('tenant-two');

        $userOne = TestUsers::tenantOwner('tenant-one');
        $userTwo = TestUsers::tenantOwner('tenant-two');

        Navigation::factory()->create([
            'tenant_id' => $tenantOne->id,
            'name' => 'Tenant One Main',
            'slug' => 'tenant-one-main',
            'status' => 'published',
            'structure' => [
                ['label' => 'Home', 'url' => '/'],
                ['label' => 'Services', 'url' => '/pages/services'],
            ],
            'created_by' => $userOne->id,
        ]);

        Navigation::factory()->create([
            'tenant_id' => $tenantTwo->id,
            'name' => 'Tenant Two Main',
            'slug' => 'tenant-two-main',
            'status' => 'published',
            'structure' => [
                ['label' => 'Home', 'url' => '/'],
            ],
            'created_by' => $userTwo->id,
        ]);

        $page = $this->createTenantPage('tenant-one', [
            'title' => 'Home',
            'slug' => 'home',
            'is_homepage' => true,
            'puck_data' => ['content' => []],
            'puck_data_compiled' => null,
        ]);

        $compiled = app(PuckCompilerService::class)->compilePage($page);
        $page->update(['puck_data_compiled' => $compiled]);

        $response = $this->getJson($this->tenantUrl('/api/pages/public/homepage', 'tenant-one'));

        $response->assertOk();
        $response->assertJsonPath('data.puck_data.metadata.navigations.0.name', 'Tenant One Main');
        $response->assertJsonMissingPath('data.puck_data.metadata.navigations.1');
    }
}
