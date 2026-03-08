<?php

namespace Tests\Unit\Services\Gateways;

use App\DataObjects\PaymentData;
use App\Services\Gateways\KlarnaGateway;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class KlarnaGatewayTest extends TestCase
{
    #[Test]
    public function create_payment_sends_session_payload_and_returns_client_token(): void
    {
        $called = false;

        $gateway = new KlarnaGateway(
            credentials: [
                'username' => 'PK_test_123456',
                'password' => 'secret',
                'api_region' => 'eu',
                'playground' => true,
            ],
            createSessionHandler: function (array $payload) use (&$called): array {
                $called = true;
                $this->assertSame(19900, $payload['order_amount']);
                $this->assertSame('SEK', $payload['purchase_currency']);

                return [
                    'session_id' => 'ks_123',
                    'client_token' => 'kt_456',
                ];
            }
        );

        $result = $gateway->createPayment(new PaymentData(
            amount: 19900,
            currency: 'SEK',
            metadata: [
                'locale' => 'sv-SE',
                'order_lines' => [
                    ['name' => 'Order item', 'quantity' => 1, 'unit_price' => 19900, 'tax_rate' => 2500],
                ],
            ],
        ));

        $this->assertTrue($called);
        $this->assertTrue($result->success);
        $this->assertSame('ks_123', $result->providerTransactionId);
        $this->assertSame('kt_456', $result->clientSecret);
    }

    #[Test]
    public function authorize_flow_uses_authorization_token(): void
    {
        $called = false;

        $gateway = new KlarnaGateway(
            credentials: [
                'username' => 'PK_test_123456',
                'password' => 'secret',
            ],
            authorizeHandler: function (string $token, array $payload) use (&$called): array {
                $called = true;
                $this->assertSame('auth_token_123', $token);
                $this->assertSame(19900, $payload['order_amount']);

                return ['order_id' => 'ko_123'];
            }
        );

        $result = $gateway->authorize('auth_token_123', [
            'order_amount' => 19900,
            'order_lines' => [['name' => 'Item']],
        ]);

        $this->assertTrue($called);
        $this->assertSame('ko_123', $result['order_id']);
    }

    #[Test]
    public function capture_flow_returns_capture_id(): void
    {
        $called = false;

        $gateway = new KlarnaGateway(
            credentials: [
                'username' => 'PK_test_123456',
                'password' => 'secret',
            ],
            captureHandler: function (string $orderId, ?int $amount) use (&$called): array {
                $called = true;
                $this->assertSame('ko_123', $orderId);
                $this->assertSame(19900, $amount);

                return ['capture_id' => 'kc_123'];
            }
        );

        $result = $gateway->capture('ko_123', 19900);

        $this->assertTrue($called);
        $this->assertSame('kc_123', $result['capture_id']);
    }

    #[Test]
    public function refund_calls_refund_handler(): void
    {
        $called = false;

        $gateway = new KlarnaGateway(
            credentials: [
                'username' => 'PK_test_123456',
                'password' => 'secret',
            ],
            refundHandler: function (string $orderId, int $amount, ?string $reason) use (&$called): array {
                $called = true;
                $this->assertSame('ko_123', $orderId);
                $this->assertSame(1000, $amount);
                $this->assertSame('Customer request', $reason);

                return ['refund_id' => 'kr_123'];
            }
        );

        $result = $gateway->refund('ko_123', 1000, 'Customer request');

        $this->assertTrue($called);
        $this->assertTrue($result->success);
        $this->assertSame('kr_123', $result->providerRefundId);
    }

    #[Test]
    public function validate_credentials_checks_username_and_password(): void
    {
        $gateway = new KlarnaGateway([]);

        $this->assertTrue($gateway->validateCredentials([
            'username' => 'PK_test_123456',
            'password' => 'secret',
        ]));

        $this->assertFalse($gateway->validateCredentials([
            'username' => 'invalid',
            'password' => '',
        ]));
    }
}
