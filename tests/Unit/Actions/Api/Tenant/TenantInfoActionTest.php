<?php

namespace Tests\Unit\Actions\Api\Tenant;

use App\Actions\Api\Tenant\TenantInfoAction;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TenantInfoActionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_returns_tenant_information()
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
        ]);

        // For testing, we need to set the current tenant
        // This is a simplified test - in real scenarios, tenancy middleware would handle this
        tenancy()->initialize($tenant);

        $action = new TenantInfoAction();
        $result = $action->execute();

        $this->assertEquals($tenant->id, $result['id']);
        $this->assertEquals('Test Tenant', $result['name']);
        $this->assertEquals('test-tenant', $result['slug']);
        $this->assertIsArray($result['domains']);
    }

    #[Test]
    public function it_throws_exception_when_no_tenant()
    {
        // Ensure no tenant is set
        tenancy()->end();

        $action = new TenantInfoAction();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('No tenant found');

        $action->execute();
    }
}
