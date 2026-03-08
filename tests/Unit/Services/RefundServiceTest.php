<?php

namespace Tests\Unit\Services;

use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantPaymentProvider;
use App\Services\RefundService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RefundServiceTest extends TestCase
{
    private RefundService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(RefundService::class);
    }

    #[Test]
    public function it_processes_partial_and_full_refunds_and_records_events(): void
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
            'provider_transaction_id' => 'pi_test_refund_123',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 30000,
            'currency' => 'SEK',
            'metadata' => ['tenant_id' => (string) $tenant->id],
            'paid_at' => now(),
        ]);

        $partial = $this->service->processRefund($payment, 10000, 'Partial refund');
        $payment->refresh();

        $this->assertSame('completed', $partial->status);
        $this->assertSame(Payment::STATUS_PARTIALLY_REFUNDED, $payment->status);

        $full = $this->service->processRefund($payment, 20000, 'Final refund');
        $payment->refresh();

        $this->assertSame('completed', $full->status);
        $this->assertSame(Payment::STATUS_REFUNDED, $payment->status);

        $this->assertDatabaseHas('analytics_events', [
            'tenant_id' => (string) $tenant->id,
            'event_type' => AnalyticsEvent::TYPE_PAYMENT_REFUNDED,
        ]);
    }
}
