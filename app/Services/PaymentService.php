<?php

namespace App\Services;

use App\Contracts\PaymentGatewayContract;
use App\DataObjects\PaymentData;
use App\DataObjects\PaymentResult;
use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\TenantPaymentProvider;
use App\Services\Gateways\KlarnaGateway;
use App\Services\Gateways\StripeGateway;
use App\Services\Gateways\SwishGateway;
use Illuminate\Pagination\LengthAwarePaginator;

class PaymentService
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function resolveGateway(string $tenantId, string $provider): PaymentGatewayContract
    {
        $config = TenantPaymentProvider::query()
            ->forTenant($tenantId)
            ->where('provider', $provider)
            ->where('is_active', true)
            ->firstOrFail();

        return match ($provider) {
            'stripe' => new StripeGateway((array) $config->credentials),
            'swish' => new SwishGateway((array) $config->credentials),
            'klarna' => new KlarnaGateway((array) $config->credentials),
            default => throw new \InvalidArgumentException("Unknown provider: {$provider}"),
        };
    }

    public function processPayment(string $tenantId, string $provider, PaymentData $data): PaymentResult
    {
        $gateway = $this->resolveGateway($tenantId, $provider);
        $result = $gateway->createPayment($data);

        $payment = Payment::query()->create([
            'tenant_id' => $tenantId,
            'provider' => $provider,
            'provider_transaction_id' => $result->providerTransactionId,
            'status' => $result->success ? Payment::STATUS_PROCESSING : Payment::STATUS_FAILED,
            'amount' => $data->amount,
            'currency' => strtoupper($data->currency),
            'customer_email' => $data->customerEmail,
            'customer_name' => $data->customerName,
            'metadata' => $data->metadata,
            'provider_response' => $result->rawResponse,
            'failed_at' => $result->success ? null : now(),
        ]);

        if (!$result->success) {
            $this->analyticsService->record(
                AnalyticsEvent::TYPE_PAYMENT_FAILED,
                [
                    'payment_id' => $payment->id,
                    'provider' => $provider,
                    'amount' => $data->amount,
                    'reason' => $result->errorMessage,
                ],
                tenantId: $tenantId,
                subject: $payment,
            );
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function listPayments(string $tenantId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Payment::query()->forTenant($tenantId)->latest('id');

        $status = $filters['status'] ?? null;
        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        $provider = $filters['provider'] ?? null;
        if (is_string($provider) && $provider !== '') {
            $query->where('provider', $provider);
        }

        $from = $filters['from'] ?? null;
        $to = $filters['to'] ?? null;
        if (is_string($from) && is_string($to) && $from !== '' && $to !== '') {
            $query->between($from, $to);
        }

        return $query->paginate($perPage);
    }

    public function getPaymentForTenant(string $tenantId, int $paymentId): Payment
    {
        return Payment::query()
            ->forTenant($tenantId)
            ->with('refunds')
            ->findOrFail($paymentId);
    }
}
