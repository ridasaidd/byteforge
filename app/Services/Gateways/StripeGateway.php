<?php

namespace App\Services\Gateways;

use App\Contracts\PaymentGatewayContract;
use App\DataObjects\PaymentData;
use App\DataObjects\PaymentResult;
use App\DataObjects\PaymentStatus;
use App\DataObjects\RefundResult;
use App\DataObjects\WebhookResult;
use Illuminate\Http\Request;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use UnexpectedValueException;

class StripeGateway implements PaymentGatewayContract
{
    private const TEST_INTENT_ID_PATTERN = 'pi_%s';
    private const TEST_CLIENT_SECRET_PATTERN = 'pi_%s_secret_%s';

    /**
     * @param array<string, mixed> $credentials
     */
    public function __construct(
        private readonly array $credentials,
        private readonly mixed $createIntentHandler = null,
        private readonly mixed $retrieveIntentHandler = null,
        private readonly mixed $refundHandler = null,
    ) {}

    public function createPayment(PaymentData $data): PaymentResult
    {
        $payload = [
            'amount' => $data->amount,
            'currency' => strtolower($data->currency),
            'description' => $data->description,
            'metadata' => $data->metadata,
            'receipt_email' => $data->customerEmail,
            'automatic_payment_methods' => ['enabled' => true],
        ];

        if (is_callable($this->createIntentHandler)) {
            $intent = ($this->createIntentHandler)($payload, $this->credentials);

            return new PaymentResult(
                success: true,
                providerTransactionId: (string) ($intent['id'] ?? ''),
                clientSecret: (string) ($intent['client_secret'] ?? ''),
                rawResponse: is_array($intent) ? $intent : null,
            );
        }

        if (app()->environment('testing')) {
            $intentToken = bin2hex(random_bytes(12));
            $secretToken = bin2hex(random_bytes(16));
            $id = sprintf(self::TEST_INTENT_ID_PATTERN, $intentToken);
            $clientSecret = sprintf(self::TEST_CLIENT_SECRET_PATTERN, $intentToken, $secretToken);

            return new PaymentResult(
                success: true,
                providerTransactionId: $id,
                clientSecret: $clientSecret,
                rawResponse: ['id' => $id, 'client_secret' => $clientSecret],
            );
        }

        $client = $this->client();
        $intent = $client->paymentIntents->create(array_filter($payload, static fn ($v) => $v !== null));

        return new PaymentResult(
            success: true,
            providerTransactionId: (string) $intent->id,
            clientSecret: (string) $intent->client_secret,
            rawResponse: $intent->toArray(),
        );
    }

    public function getPaymentStatus(string $providerTransactionId): PaymentStatus
    {
        if (is_callable($this->retrieveIntentHandler)) {
            $intent = ($this->retrieveIntentHandler)($providerTransactionId, $this->credentials);
            return new PaymentStatus((string) ($intent['status'] ?? 'unknown'), is_array($intent) ? $intent : null);
        }

        if (app()->environment('testing')) {
            return new PaymentStatus('succeeded', ['id' => $providerTransactionId]);
        }

        $intent = $this->client()->paymentIntents->retrieve($providerTransactionId, []);

        return new PaymentStatus((string) $intent->status, $intent->toArray());
    }

    public function refund(string $providerTransactionId, int $amount, ?string $reason = null): RefundResult
    {
        $payload = [
            'payment_intent' => $providerTransactionId,
            'amount' => $amount,
        ];

        if ($reason !== null && $reason !== '') {
            $payload['metadata'] = ['reason' => $reason];
        }

        if (is_callable($this->refundHandler)) {
            $refund = ($this->refundHandler)($payload, $this->credentials);

            return new RefundResult(
                success: true,
                providerRefundId: (string) ($refund['id'] ?? ''),
                rawResponse: is_array($refund) ? $refund : null,
            );
        }

        if (app()->environment('testing')) {
            $id = 're_test_' . str_replace('.', '', uniqid('', true));

            return new RefundResult(
                success: true,
                providerRefundId: $id,
                rawResponse: ['id' => $id],
            );
        }

        $refund = $this->client()->refunds->create($payload);

        return new RefundResult(
            success: true,
            providerRefundId: (string) $refund->id,
            rawResponse: $refund->toArray(),
        );
    }

    public function handleWebhook(Request $request): WebhookResult
    {
        $secret = (string) ($this->credentials['webhook_secret'] ?? '');
        $signature = (string) $request->header('Stripe-Signature', '');

        try {
            $event = Webhook::constructEvent($request->getContent(), $signature, $secret);
        } catch (SignatureVerificationException|UnexpectedValueException $e) {
            return new WebhookResult(isValid: false, payload: []);
        }

        $payload = $event->toArray();
        $object = data_get($payload, 'data.object', []);

        return new WebhookResult(
            isValid: true,
            eventType: (string) data_get($payload, 'type', ''),
            providerTransactionId: (string) data_get($object, 'id', ''),
            status: (string) data_get($object, 'status', ''),
            payload: $payload,
        );
    }

    public function validateCredentials(array $credentials): bool
    {
        $publishable = (string) ($credentials['publishable_key'] ?? '');
        $secret = (string) ($credentials['secret_key'] ?? '');

        return (bool) preg_match('/^pk_(test|live)_[A-Za-z0-9_]+$/', $publishable)
            && (bool) preg_match('/^sk_(test|live)_[A-Za-z0-9_]+$/', $secret);
    }

    public function getRequiredCredentialFields(): array
    {
        return ['publishable_key', 'secret_key', 'webhook_secret'];
    }

    public function getProviderName(): string
    {
        return 'stripe';
    }

    private function client(): StripeClient
    {
        return new StripeClient((string) ($this->credentials['secret_key'] ?? ''));
    }
}
