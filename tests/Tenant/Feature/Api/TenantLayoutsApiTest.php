<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\Layout;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantLayoutsApiTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function tenant_layout_name_is_normalized_on_create_and_update(): void
    {
        $createResponse = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/layouts'), [
                'name' => '  <b>Main   Layout</b>  ',
                'status' => 'draft',
            ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.name', 'Main Layout')
            ->assertJsonPath('data.slug', 'main-layout');

        $layout = Layout::findOrFail($createResponse->json('data.id'));
        $this->assertSame('Main Layout', $layout->name);

        $updateResponse = $this->actingAsTenantOwner('tenant-one')
            ->putJson($this->tenantUrl("/api/layouts/{$layout->id}"), [
                'name' => "\t<p>Updated   Layout</p>\n",
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.name', 'Updated Layout');

        $layout->refresh();
        $this->assertSame('Updated Layout', $layout->name);
    }
}
