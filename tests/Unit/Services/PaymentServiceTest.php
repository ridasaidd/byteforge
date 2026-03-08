<?php

namespace Tests\Unit\Services;

use App\DataObjects\PaymentData;
use App\Models\AnalyticsEvent;
use App\Models\Tenant;
use App\Models\TenantPaymentProvider;
use App\Services\Gateways\StripeGateway;
use App\Services\PaymentService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    private PaymentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PaymentService::class);
    }

    #[Test]
    public function resolve_gateway_returns_correct_gateway_for_active_provider(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        TenantPaymentProvider::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'provider' => 'stripe'],
            [
                'credentials' => [
                    'publishable_key' => 'pk_test_1234567890abc',
                    'secret_key' => 'sk_test_1234567890xyz',
                    'webhook_secret' => 'whsec_123',
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );

        $gateway = $this->service->resolveGateway((string) $tenant->id, 'stripe');

        $this->assertInstanceOf(StripeGateway::class, $gateway);
    }

    #[Test]
    public function resolve_gateway_throws_for_missing_provider_config(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        $this->service->resolveGateway((string) $tenant->id, 'stripe');
    }

    #[Test]
    public function process_payment_creates_record_and_failed_event_when_gateway_fails(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        TenantPaymentProvider::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'provider' => 'swish'],
            [
                'credentials' => [
                    'merchant_swish_number' => '1231234567',
                    'certificate' => '/tmp/client.pem',
                    'private_key' => '/tmp/private.key',
                    'ca_certificate' => '/tmp/ca.pem',
                    'callback_url' => 'https://tenant-one.byteforge.se/api/payments/swish/callback',
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );

        $result = $this->service->processPayment(
            (string) $tenant->id,
            'swish',
            new PaymentData(
                amount: 10000,
                currency: 'EUR',
                description: 'Should fail for Swish',
                customerEmail: 'customer@example.com',
            )
        );

        $this->assertFalse($result->success);

        $this->assertDatabaseHas('payments', [
            'tenant_id' => (string) $tenant->id,
            'provider' => 'swish',
            'status' => 'failed',
            'amount' => 10000,
            'currency' => 'EUR',
        ]);

        $this->assertDatabaseHas('analytics_events', [
            'tenant_id' => (string) $tenant->id,
            'event_type' => AnalyticsEvent::TYPE_PAYMENT_FAILED,
        ]);
    }
}
