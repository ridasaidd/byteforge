<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\TenantPaymentProvider;
use App\Services\AnalyticsService;
use App\Services\Gateways\KlarnaGateway;
use App\Services\Gateways\StripeGateway;
use App\Services\Gateways\SwishGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function stripe(Request $request): JsonResponse
    {
        $tenantId = (string) (tenant('id') ?? '');
        if ($tenantId === '') {
            return response()->json(['message' => 'Tenant context missing.'], 404);
        }

        $provider = TenantPaymentProvider::query()
            ->forTenant($tenantId)
            ->where('provider', 'stripe')
            ->active()
            ->first();

        if (!$provider) {
            return response()->json(['message' => 'Stripe provider not configured.'], 404);
        }

        $gateway = new StripeGateway((array) $provider->credentials);
        $result = $gateway->handleWebhook($request);

        if (!$result->isValid) {
            return response()->json(['message' => 'Invalid Stripe signature.'], 400);
        }

        if (!in_array($result->eventType, ['payment_intent.succeeded', 'payment_intent.payment_failed'], true)) {
            return response()->json(['received' => true, 'event' => $result->eventType]);
        }

        $payment = Payment::query()
            ->forTenant($tenantId)
            ->where('provider', 'stripe')
            ->where('provider_transaction_id', $result->providerTransactionId)
            ->first();

        if ($payment) {
            if ($result->eventType === 'payment_intent.succeeded') {
                $payment->update([
                    'status' => Payment::STATUS_COMPLETED,
                    'paid_at' => now(),
                ]);

                $this->analyticsService->record(
                    AnalyticsEvent::TYPE_PAYMENT_CAPTURED,
                    [
                        'payment_id' => $payment->id,
                        'provider' => 'stripe',
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                    ],
                    tenantId: $tenantId,
                    subject: $payment,
                );
            }

            if ($result->eventType === 'payment_intent.payment_failed') {
                $payment->update([
                    'status' => Payment::STATUS_FAILED,
                    'failed_at' => now(),
                ]);

                $this->analyticsService->record(
                    AnalyticsEvent::TYPE_PAYMENT_FAILED,
                    [
                        'payment_id' => $payment->id,
                        'provider' => 'stripe',
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                    ],
                    tenantId: $tenantId,
                    subject: $payment,
                );
            }
        }

        return response()->json(['received' => true, 'event' => $result->eventType]);
    }

    public function swish(Request $request): JsonResponse
    {
        $tenantId = (string) (tenant('id') ?? '');
        if ($tenantId === '') {
            return response()->json(['message' => 'Tenant context missing.'], 404);
        }

        $provider = TenantPaymentProvider::query()
            ->forTenant($tenantId)
            ->where('provider', 'swish')
            ->active()
            ->first();

        if (!$provider) {
            return response()->json(['message' => 'Swish provider not configured.'], 404);
        }

        $gateway = new SwishGateway((array) $provider->credentials);
        $result = $gateway->handleWebhook($request);

        if (!$result->isValid) {
            return response()->json(['message' => 'Invalid Swish callback payload.'], 400);
        }

        $payment = Payment::query()
            ->forTenant($tenantId)
            ->where('provider', 'swish')
            ->where('provider_transaction_id', $result->providerTransactionId)
            ->first();

        if ($payment) {
            // Cross-verify with Swish API — callbacks are unsigned, so we
            // fetch the authoritative status before updating payment state.
            try {
                $apiStatus = $gateway->getPaymentStatus($result->providerTransactionId);
                $swishStatus = strtoupper((string) $apiStatus->status);
            } catch (\Throwable $e) {
                // If the API call fails, reject the callback rather than
                // trusting the unverified payload.
                return response()->json(['message' => 'Unable to verify callback with Swish API.'], 503);
            }

            if (in_array($swishStatus, ['PAID', 'COMPLETED'], true)) {
                $payment->update([
                    'status' => Payment::STATUS_COMPLETED,
                    'paid_at' => now(),
                ]);

                $this->analyticsService->record(
                    AnalyticsEvent::TYPE_PAYMENT_CAPTURED,
                    [
                        'payment_id' => $payment->id,
                        'provider' => 'swish',
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                    ],
                    tenantId: $tenantId,
                    subject: $payment,
                );
            }

            if (in_array($swishStatus, ['ERROR', 'DECLINED', 'CANCELLED'], true)) {
                $payment->update([
                    'status' => Payment::STATUS_FAILED,
                    'failed_at' => now(),
                ]);

                $this->analyticsService->record(
                    AnalyticsEvent::TYPE_PAYMENT_FAILED,
                    [
                        'payment_id' => $payment->id,
                        'provider' => 'swish',
                        'amount' => $payment->amount,
                        'currency' => $payment->currency,
                    ],
                    tenantId: $tenantId,
                    subject: $payment,
                );
            }
        }

        return response()->json(['received' => true, 'event' => 'swish.callback']);
    }

    public function klarna(Request $request): JsonResponse
    {
        $tenantId = (string) (tenant('id') ?? '');
        if ($tenantId === '') {
            return response()->json(['message' => 'Tenant context missing.'], 404);
        }

        $provider = TenantPaymentProvider::query()
            ->forTenant($tenantId)
            ->where('provider', 'klarna')
            ->active()
            ->first();

        if (!$provider) {
            return response()->json(['message' => 'Klarna provider not configured.'], 404);
        }

        $gateway = new KlarnaGateway((array) $provider->credentials);
        $result = $gateway->handleWebhook($request);

        if (!$result->isValid) {
            return response()->json(['message' => 'Invalid Klarna callback payload.'], 400);
        }

        return response()->json(['received' => true, 'event' => $result->eventType]);
    }
}
