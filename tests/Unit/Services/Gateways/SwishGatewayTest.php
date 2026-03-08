<?php

namespace Tests\Unit\Services\Gateways;

use App\DataObjects\PaymentData;
use App\Services\Gateways\SwishGateway;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SwishGatewayTest extends TestCase
{
    #[Test]
    public function create_payment_delegates_to_handler_and_converts_minor_units_to_decimal(): void
    {
        $called = false;

        $gateway = new SwishGateway(
            credentials: [
                'merchant_swish_number' => '1231234567',
                'callback_url' => 'https://tenant-one.byteforge.se/api/payments/swish/callback',
            ],
            createPaymentHandler: function (array $payload) use (&$called): array {
                $called = true;
                $this->assertSame('199.00', $payload['amount']);
                $this->assertSame('SEK', $payload['currency']);

                return [
                    'id' => '11111111-1111-1111-1111-111111111111',
                    'location' => 'https://mss.cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests/1111',
                    'paymentRequestToken' => 'token_123',
                ];
            }
        );

        $result = $gateway->createPayment(new PaymentData(
            amount: 19900,
            currency: 'SEK',
            description: 'Swish test payment',
            metadata: ['payer_alias' => '46701234567'],
        ));

        $this->assertTrue($called);
        $this->assertTrue($result->success);
        $this->assertSame('11111111-1111-1111-1111-111111111111', $result->providerTransactionId);
    }

    #[Test]
    public function create_payment_rejects_non_sek_currencies(): void
    {
        $gateway = new SwishGateway([
            'merchant_swish_number' => '1231234567',
            'callback_url' => 'https://tenant-one.byteforge.se/api/payments/swish/callback',
        ]);

        $result = $gateway->createPayment(new PaymentData(
            amount: 1000,
            currency: 'EUR',
            description: 'Invalid currency test',
            metadata: ['payer_alias' => '46701234567'],
        ));

        $this->assertFalse($result->success);
        $this->assertSame('Swish only supports SEK payments.', $result->errorMessage);
    }

    #[Test]
    public function handle_webhook_uses_callback_parse_result(): void
    {
        $gateway = new SwishGateway(
            credentials: [],
            parseCallbackHandler: function (): object {
                return new class {
                    public string $id = '11111111-1111-1111-1111-111111111111';
                    public string $status = 'PAID';

                    public function toArray(): array
                    {
                        return ['id' => $this->id, 'status' => $this->status];
                    }
                };
            }
        );

        $request = Request::create('/api/payments/swish/callback', 'POST', [], [], [], [], '{}');
        $result = $gateway->handleWebhook($request);

        $this->assertTrue($result->isValid);
        $this->assertSame('swish.callback', $result->eventType);
        $this->assertSame('PAID', $result->status);
    }

    #[Test]
    public function validate_credentials_checks_merchant_number_and_required_fields(): void
    {
        $gateway = new SwishGateway([]);

        $this->assertTrue($gateway->validateCredentials([
            'merchant_swish_number' => '1231234567',
            'certificate' => '/tmp/client.pem',
            'private_key' => '/tmp/private.key',
            'ca_certificate' => '/tmp/ca.pem',
        ]));

        $this->assertFalse($gateway->validateCredentials([
            'merchant_swish_number' => '0701234567',
            'certificate' => '',
            'private_key' => '',
            'ca_certificate' => '',
        ]));
    }
}
