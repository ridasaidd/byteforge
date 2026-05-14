<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\Page;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantPagesApiTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_page_update_accepts_large_generated_page_css(): void
    {
        $tenant = TestUsers::tenant('tenant-one');

        $page = Page::factory()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Large CSS Page',
            'slug' => 'large-css-page',
            'page_type' => 'general',
            'status' => 'draft',
        ]);

        $pageCss = str_repeat('.page-css-limit-check{color:#123456;background:#abcdef;}', 1400);

        $this->assertGreaterThan(65535, strlen($pageCss));

        $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->tenantUrl("/api/pages/{$page->id}", 'tenant-one'), [
                'page_css' => $pageCss,
            ])
            ->assertOk();

        $this->assertSame($pageCss, $page->fresh()->page_css);
    }
}
