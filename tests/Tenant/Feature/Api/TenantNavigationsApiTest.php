<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\Navigation;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantNavigationsApiTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_navigation_name_is_normalized_on_create_and_update(): void
    {
        $createResponse = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/navigations'), [
                'name' => '  <b>Main   Menu</b>  ',
                'slug' => 'main-menu',
                'status' => 'draft',
                'structure' => [],
            ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.name', 'Main Menu')
            ->assertJsonPath('data.slug', 'main-menu');

        $navigation = Navigation::findOrFail($createResponse->json('data.id'));
        $this->assertSame('Main Menu', $navigation->name);

        $updateResponse = $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->tenantUrl("/api/navigations/{$navigation->id}"), [
                'name' => "\t<p>Updated   Menu</p>\n",
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.name', 'Updated Menu');

        $navigation->refresh();
        $this->assertSame('Updated Menu', $navigation->name);
    }
}
