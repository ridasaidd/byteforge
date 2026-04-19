<?php

namespace Tests\Feature\Api;

use App\Models\Addon;
use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Models\TenantPaymentProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SwishPaymentFlowTest extends TestCase
{
    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    #[Test]
    public function create_swish_payment_returns_403_without_payments_manage(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertSwishProvider($tenant);

        $response = $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/swish/create'), [
                'amount' => 19900,
                'currency' => 'SEK',
                'payer_alias' => '46701234567',
                'message' => 'Test payment',
            ]);

        $response->assertForbidden();
    }

    #[Test]
    public function create_swish_payment_creates_pending_payment_and_returns_token(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertSwishProvider($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/swish/create'), [
                'amount' => 19900,
                'currency' => 'SEK',
                'payer_alias' => '46701234567',
                'message' => 'Flow payment',
            ]);

        $response->assertOk()->assertJsonStructure([
            'payment_id',
            'provider_transaction_id',
            'payment_request_token',
            'redirect_url',
        ]);

        $this->assertDatabaseHas('payments', [
            'tenant_id' => (string) $tenant->id,
            'provider' => 'swish',
            'status' => Payment::STATUS_PENDING,
            'amount' => 19900,
            'currency' => 'SEK',
        ]);
    }

    #[Test]
    public function create_swish_payment_normalizes_message_before_gateway_handoff(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertSwishProvider($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/swish/create'), [
                'amount' => 19900,
                'currency' => 'SEK',
                'payer_alias' => '46701234567',
                'message' => "  <b>Flow\n payment</b> \t ",
            ]);

        $response->assertOk();

        $payment = Payment::query()->findOrFail((int) $response->json('payment_id'));

        $this->assertSame('Flow payment', data_get($payment->provider_response, 'message'));
    }

    #[Test]
    public function swish_callback_updates_payment_to_completed_and_records_analytics(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertSwishProvider($tenant);

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'swish',
            'provider_transaction_id' => '11111111-1111-1111-1111-111111111111',
            'status' => Payment::STATUS_PENDING,
            'amount' => 9900,
            'currency' => 'SEK',
            'metadata' => ['tenant_id' => (string) $tenant->id],
        ]);

        $payload = json_encode([
            'id' => '11111111-1111-1111-1111-111111111111',
            'status' => 'PAID',
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            $this->tenantUrl('/api/payments/swish/callback'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
            ],
            $payload,
        );

        $response->assertOk()->assertJson([
            'received' => true,
            'event' => 'swish.callback',
        ]);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => Payment::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('analytics_events', [
            'tenant_id' => (string) $tenant->id,
            'event_type' => AnalyticsEvent::TYPE_PAYMENT_CAPTURED,
        ]);
    }

    #[Test]
    public function swish_status_endpoint_returns_current_status(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertSwishProvider($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/payments/swish/11111111-1111-1111-1111-111111111111/status'));

        $response->assertOk();
        $response->assertJsonPath('data.provider_transaction_id', '11111111-1111-1111-1111-111111111111');
        $response->assertJsonPath('data.status', 'PAID');
    }

    private function activatePaymentsAddonForTenant(Tenant $tenant): void
    {
        $addon = Addon::query()->where('feature_flag', 'payments')->first();

        if (!$addon) {
            $addon = Addon::query()->updateOrCreate(
                ['slug' => 'payments'],
                [
                    'name' => 'Payment Processing',
                    'description' => 'Enables payment providers',
                    'stripe_price_id' => 'price_payments_placeholder',
                    'price_monthly' => 7900,
                    'currency' => 'SEK',
                    'feature_flag' => 'payments',
                    'is_active' => true,
                    'sort_order' => 2,
                ]
            );
        }

        TenantAddon::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'addon_id' => $addon->id,
            ],
            [
                'activated_at' => now(),
                'deactivated_at' => null,
            ]
        );
    }

    private function upsertSwishProvider(Tenant $tenant): TenantPaymentProvider
    {
        return TenantPaymentProvider::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'provider' => 'swish',
            ],
            [
                'credentials' => [
                    'merchant_swish_number' => '1231234567',
                    'certificate' => '/tmp/swish-client.pem',
                    'private_key' => '/tmp/swish-private.key',
                    'ca_certificate' => '/tmp/swish-ca.pem',
                    'callback_url' => 'https://tenant-one.byteforge.se/api/payments/swish/callback',
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );
    }
}
