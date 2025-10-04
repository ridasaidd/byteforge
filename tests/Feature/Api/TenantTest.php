<?php

namespace Tests\Feature\Api;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class TenantTest extends TestCase
{
    use DatabaseMigrations, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function authenticated_user_can_get_tenant_info()
    {
        // Use existing tenant instead of creating new one
        $tenant = Tenant::where('slug', 'test-tenant')->first();
        if (!$tenant) {
            $tenant = Tenant::create([
                'id' => 'test-123',
                'name' => 'Test Tenant',
                'slug' => 'test-tenant',
            ]);
            $tenant->domains()->create(['domain' => 'test-tenant.byteforge.se']);
        }

        $response = $this->withHeaders([
            'Host' => 'test-tenant.byteforge.se'
        ])->getJson('/api/info');

        $response->assertStatus(200)
                ->assertJson([
                    'id' => $tenant->id,
                    'name' => 'Test Tenant',
                    'slug' => 'test-tenant',
                ]);
    }

    #[Test]
    public function authenticated_user_can_get_tenant_dashboard()
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Test Tenant 2',
        ]);

        // Create domain for the tenant
        $domain = $tenant->domains()->create(['domain' => 'test2-tenant.byteforge.se']);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $tokenResult = $user->createToken('test-token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $tokenResult->accessToken,
            'Host' => 'test2-tenant.byteforge.se'
        ])->getJson('/api/dashboard');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'tenant' => ['id', 'name', 'slug', 'domains'],
                    'stats' => ['total_pages', 'published_pages', 'total_users'],
                ]);
    }

    #[Test]
    public function unauthenticated_user_cannot_access_tenant_dashboard()
    {
        $tenant = Tenant::factory()->create();
        $tenant->domains()->create(['domain' => 'test3-tenant.byteforge.se']);

        $response = $this->withHeaders([
            'Host' => 'test3-tenant.byteforge.se'
        ])->getJson('/api/dashboard');

        $response->assertStatus(401);
    }
}
