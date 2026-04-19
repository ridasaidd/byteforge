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

class StripePaymentFlowTest extends TestCase
{
    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    #[Test]
    public function create_intent_returns_403_without_payments_manage(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertStripeProvider($tenant);

        $response = $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/stripe/create-intent'), [
                'amount' => 15000,
                'currency' => 'SEK',
            ]);

        $response->assertForbidden();
    }

    #[Test]
    public function create_intent_returns_client_secret_and_creates_pending_payment(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertStripeProvider($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/stripe/create-intent'), [
                'amount' => 29900,
                'currency' => 'SEK',
                'description' => 'Stripe flow test payment',
                'customer_email' => 'customer@example.com',
                'metadata' => ['booking_id' => 42],
            ]);

        $response->assertOk()->assertJsonStructure([
            'payment_id',
            'client_secret',
            'provider_transaction_id',
        ]);

        $this->assertMatchesRegularExpression(
            '/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/',
            (string) $response->json('client_secret')
        );

        $paymentId = (int) $response->json('payment_id');
        $providerTransactionId = (string) $response->json('provider_transaction_id');

        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'tenant_id' => (string) $tenant->id,
            'provider' => 'stripe',
            'provider_transaction_id' => $providerTransactionId,
            'status' => Payment::STATUS_PENDING,
            'amount' => 29900,
            'currency' => 'SEK',
        ]);
    }

    #[Test]
    public function webhook_with_valid_signature_marks_payment_completed_and_records_analytics(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $provider = $this->upsertStripeProvider($tenant);

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_webhook_success_123',
            'status' => Payment::STATUS_PENDING,
            'amount' => 19900,
            'currency' => 'SEK',
            'metadata' => ['tenant_id' => (string) $tenant->id],
        ]);

        $payload = json_encode([
            'id' => 'evt_webhook_1',
            'object' => 'event',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_webhook_success_123',
                    'status' => 'succeeded',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $secret = (string) data_get($provider->credentials, 'webhook_secret');
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);

        $response = $this->call(
            'POST',
            $this->tenantUrl('/api/payments/stripe/webhook'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
                'HTTP_STRIPE_SIGNATURE' => sprintf('t=%d,v1=%s', $timestamp, $signature),
            ],
            $payload,
        );

        $response->assertOk()->assertJson([
            'received' => true,
            'event' => 'payment_intent.succeeded',
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
    public function webhook_with_invalid_signature_returns_400(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertStripeProvider($tenant);

        $payload = json_encode([
            'id' => 'evt_webhook_invalid',
            'object' => 'event',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_invalid',
                    'status' => 'succeeded',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            $this->tenantUrl('/api/payments/stripe/webhook'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
                'HTTP_STRIPE_SIGNATURE' => 't=1,v1=invalid',
            ],
            $payload,
        );

        $response->assertStatus(400);
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

    private function upsertStripeProvider(Tenant $tenant): TenantPaymentProvider
    {
        return TenantPaymentProvider::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'provider' => 'stripe',
            ],
            [
                'credentials' => [
                    'publishable_key' => 'pk_test_1234567890abc',
                    'secret_key' => 'sk_test_1234567890xyz',
                    'webhook_secret' => 'whsec_tenant_stripe_123',
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );
    }
}
