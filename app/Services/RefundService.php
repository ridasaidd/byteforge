<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Validation\ValidationException;

class RefundService
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly AnalyticsService $analyticsService,
    ) {}

    public function processRefund(Payment $payment, int $amount, ?string $reason = null): Refund
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Refund amount must be greater than 0.',
            ]);
        }

        $totalPreviouslyRefunded = (int) Refund::query()
            ->where('payment_id', $payment->id)
            ->where('status', 'completed')
            ->sum('amount');

        $refundable = (int) $payment->amount - $totalPreviouslyRefunded;

        if ($amount > $refundable) {
            throw ValidationException::withMessages([
                'amount' => "Refund amount exceeds refundable balance ({$refundable}).",
            ]);
        }

        $gateway = $this->paymentService->resolveGateway((string) $payment->tenant_id, (string) $payment->provider);

        $providerTransactionId = (string) $payment->provider_transaction_id;
        if ($payment->provider === 'klarna') {
            $providerTransactionId = (string) data_get($payment->metadata, 'klarna_order_id', $providerTransactionId);
        }

        $result = $gateway->refund($providerTransactionId, $amount, $reason);

        $refund = Refund::query()->create([
            'tenant_id' => (string) $payment->tenant_id,
            'payment_id' => $payment->id,
            'provider_refund_id' => $result->providerRefundId,
            'amount' => $amount,
            'reason' => $reason,
            'status' => $result->success ? 'completed' : 'failed',
        ]);

        if ($result->success) {
            $totalRefunded = (int) Refund::query()
                ->where('payment_id', $payment->id)
                ->where('status', 'completed')
                ->sum('amount');

            $newStatus = $totalRefunded >= (int) $payment->amount
                ? Payment::STATUS_REFUNDED
                : Payment::STATUS_PARTIALLY_REFUNDED;

            $payment->update([
                'status' => $newStatus,
                'refunded_at' => $newStatus === Payment::STATUS_REFUNDED ? now() : null,
            ]);

            $this->analyticsService->record(
                AnalyticsEvent::TYPE_PAYMENT_REFUNDED,
                [
                    'payment_id' => $payment->id,
                    'amount' => $amount,
                    'reason' => $reason,
                    'provider' => $payment->provider,
                ],
                tenantId: (string) $payment->tenant_id,
                subject: $payment,
            );
        }

        return $refund;
    }
}
