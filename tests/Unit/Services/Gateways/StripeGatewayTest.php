<?php

namespace Tests\Unit\Services\Gateways;

use App\DataObjects\PaymentData;
use App\Services\Gateways\StripeGateway;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StripeGatewayTest extends TestCase
{
    #[Test]
    public function create_payment_uses_injected_handler_and_returns_client_secret(): void
    {
        $called = false;

        $gateway = new StripeGateway(
            credentials: [
                'publishable_key' => 'pk_test_1234567890abc',
                'secret_key' => 'sk_test_1234567890xyz',
                'webhook_secret' => 'whsec_test',
            ],
            createIntentHandler: function (array $payload) use (&$called): array {
                $called = true;
                $this->assertSame(19900, $payload['amount']);
                return [
                    'id' => 'pi_test_123',
                    'client_secret' => 'pi_test_123_secret_456',
                ];
            }
        );

        $result = $gateway->createPayment(new PaymentData(
            amount: 19900,
            currency: 'SEK',
            description: 'Unit Test Payment',
            customerEmail: 'customer@example.com',
            metadata: ['tenant_id' => 'tenant_one'],
        ));

        $this->assertTrue($called);
        $this->assertTrue($result->success);
        $this->assertSame('pi_test_123', $result->providerTransactionId);
        $this->assertSame('pi_test_123_secret_456', $result->clientSecret);
    }

    #[Test]
    public function refund_uses_injected_handler(): void
    {
        $called = false;

        $gateway = new StripeGateway(
            credentials: [
                'publishable_key' => 'pk_test_1234567890abc',
                'secret_key' => 'sk_test_1234567890xyz',
                'webhook_secret' => 'whsec_test',
            ],
            refundHandler: function (array $payload) use (&$called): array {
                $called = true;
                $this->assertSame('pi_test_123', $payload['payment_intent']);
                $this->assertSame(5000, $payload['amount']);
                return ['id' => 're_test_123'];
            }
        );

        $result = $gateway->refund('pi_test_123', 5000, 'Requested by customer');

        $this->assertTrue($called);
        $this->assertTrue($result->success);
        $this->assertSame('re_test_123', $result->providerRefundId);
    }

    #[Test]
    public function handle_webhook_verifies_signature_and_returns_webhook_result(): void
    {
        $secret = 'whsec_gateway_test_123';

        $gateway = new StripeGateway([
            'publishable_key' => 'pk_test_1234567890abc',
            'secret_key' => 'sk_test_1234567890xyz',
            'webhook_secret' => $secret,
        ]);

        $payload = json_encode([
            'id' => 'evt_123',
            'object' => 'event',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_test_123',
                    'status' => 'succeeded',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);

        $request = Request::create('/api/payments/stripe/webhook', 'POST', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => sprintf('t=%d,v1=%s', $timestamp, $signature),
            'CONTENT_TYPE' => 'application/json',
        ], $payload);

        $result = $gateway->handleWebhook($request);

        $this->assertTrue($result->isValid);
        $this->assertSame('payment_intent.succeeded', $result->eventType);
        $this->assertSame('pi_test_123', $result->providerTransactionId);
    }

    #[Test]
    public function validate_credentials_checks_stripe_key_prefixes(): void
    {
        $gateway = new StripeGateway([]);

        $this->assertTrue($gateway->validateCredentials([
            'publishable_key' => 'pk_test_1234567890abc',
            'secret_key' => 'sk_test_1234567890xyz',
        ]));

        $this->assertFalse($gateway->validateCredentials([
            'publishable_key' => 'invalid_pk',
            'secret_key' => 'invalid_sk',
        ]));
    }
}
