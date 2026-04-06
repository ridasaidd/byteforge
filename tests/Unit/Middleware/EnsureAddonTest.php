<?php

declare(strict_types=1);

namespace Tests\Unit\Middleware;

use App\Http\Middleware\EnsureAddon;
use App\Models\Addon;
use App\Models\TenantAddon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Tests\TestCase;
use Tests\Support\TestUsers;

class EnsureAddonTest extends TestCase
{
    private EnsureAddon $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new EnsureAddon();
    }

    private function makeNext(): Closure
    {
        return fn (Request $r) => response()->json(['ok' => true]);
    }

    private function initTenancy(string $slug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($slug);
        tenancy()->initialize($tenant);
        return (string) $tenant->id;
    }

    protected function tearDown(): void
    {
        if (tenancy()->initialized) {
            tenancy()->end();
        }
        parent::tearDown();
    }

    public function test_allows_request_when_addon_is_active(): void
    {
        $tenantId = $this->initTenancy('tenant-one');
        $addon = Addon::where('feature_flag', 'booking')->firstOrFail();

        TenantAddon::updateOrCreate(
            ['tenant_id' => $tenantId, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null]
        );

        $response = $this->middleware->handle(Request::create('/'), $this->makeNext(), 'booking');

        /** @var JsonResponse $response */
        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals(['ok' => true], json_decode((string) $response->getContent(), true));
    }

    public function test_returns_403_when_addon_not_active(): void
    {
        $tenantId = $this->initTenancy('tenant-one');
        $addon = Addon::where('feature_flag', 'booking')->firstOrFail();

        // Deactivate it
        TenantAddon::where('tenant_id', $tenantId)
            ->where('addon_id', $addon->id)
            ->update(['deactivated_at' => now()]);

        $response = $this->middleware->handle(Request::create('/'), $this->makeNext(), 'booking');

        $this->assertEquals(403, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertEquals('booking', $body['addon_required']);
    }

    public function test_returns_403_when_addon_row_does_not_exist(): void
    {
        $this->initTenancy('tenant-two');

        // We assume tenant-two has no booking addon
        $response = $this->middleware->handle(Request::create('/'), $this->makeNext(), 'booking');

        $this->assertEquals(403, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertArrayHasKey('addon_required', $body);
        $this->assertEquals('booking', $body['addon_required']);
    }

    public function test_returns_403_for_unknown_feature_flag(): void
    {
        $this->initTenancy('tenant-one');

        $response = $this->middleware->handle(Request::create('/'), $this->makeNext(), 'nonexistent_feature');

        $this->assertEquals(403, $response->getStatusCode());
    }
}
