<?php

namespace Tests\Feature\Api;

use App\DataObjects\PaymentData;
use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantPaymentProvider;
use App\Services\PaymentService;
use App\Services\RefundService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PaymentAnalyticsTest extends TestCase
{
    #[Test]
    public function failed_payment_writes_payment_failed_event(): void
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

        app(PaymentService::class)->processPayment(
            (string) $tenant->id,
            'swish',
            new PaymentData(amount: 5000, currency: 'EUR', description: 'Invalid swish currency')
        );

        $this->assertDatabaseHas('analytics_events', [
            'tenant_id' => (string) $tenant->id,
            'event_type' => AnalyticsEvent::TYPE_PAYMENT_FAILED,
        ]);
    }

    #[Test]
    public function successful_refund_writes_payment_refunded_event(): void
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

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_analytics_refund_1',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 8000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        app(RefundService::class)->processRefund($payment, 3000, 'Test refund event');

        $this->assertDatabaseHas('analytics_events', [
            'tenant_id' => (string) $tenant->id,
            'event_type' => AnalyticsEvent::TYPE_PAYMENT_REFUNDED,
        ]);
    }
}
