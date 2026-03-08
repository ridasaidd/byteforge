<?php

namespace Tests\Unit\Services;

use App\Actions\Api\ValidateProviderCredentialsAction;
use App\Models\Addon;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Services\PaymentProviderService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PaymentProviderServiceTest extends TestCase
{
    private PaymentProviderService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PaymentProviderService::class);
    }

    #[Test]
    public function it_masks_credentials_when_listing_configs(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);

        $this->service->store($tenant, 'stripe', [
            'publishable_key' => 'pk_test_1234567890abcdefgh',
            'secret_key' => 'sk_test_1234567890ijklmnop',
        ], true, 'test');

        $rows = $this->service->listForTenant($tenant);

        $this->assertCount(1, $rows);
        $this->assertSame('pk_test_...fgh', $rows[0]['credentials_summary']['publishable_key']);
        $this->assertSame('sk_test_...nop', $rows[0]['credentials_summary']['secret_key']);
    }

    #[Test]
    public function it_validates_credentials_during_connection_test(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);

        $invalid = $this->service->testConnection($tenant, 'stripe', [
            'publishable_key' => 'invalid',
            'secret_key' => 'invalid',
        ]);

        $valid = $this->service->testConnection($tenant, 'stripe', [
            'publishable_key' => 'pk_test_1234567890abcdefgh',
            'secret_key' => 'sk_test_1234567890ijklmnop',
        ]);

        $this->assertFalse($invalid['valid']);
        $this->assertNotEmpty($invalid['errors']);

        $this->assertTrue($valid['valid']);
        $this->assertSame([], $valid['errors']);
    }

    #[Test]
    public function it_throws_when_payments_addon_is_missing(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $this->service->store($tenant, 'stripe', [
            'publishable_key' => 'pk_test_1234567890abcdefgh',
            'secret_key' => 'sk_test_1234567890ijklmnop',
        ], true, 'test');
    }

    private function activatePaymentsAddonForTenant(Tenant $tenant): void
    {
        $addon = Addon::query()->where('feature_flag', 'payments')->first();

        if (!$addon) {
            $addon = Addon::query()->updateOrCreate(
                ['slug' => 'payments'],
                [
                    'name' => 'Payment Processing',
                    'description' => 'Enables payment providers',
                    'stripe_price_id' => 'price_payments_placeholder',
                    'price_monthly' => 7900,
                    'currency' => 'SEK',
                    'feature_flag' => 'payments',
                    'is_active' => true,
                    'sort_order' => 2,
                ]
            );
        }

        TenantAddon::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'addon_id' => $addon->id,
            ],
            [
                'activated_at' => now(),
                'deactivated_at' => null,
            ]
        );
    }
}
