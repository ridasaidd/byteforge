<?php

namespace Tests\Feature\Api;

use App\Models\Addon;
use App\Models\Tenant;
use PHPUnit\Framework\Attributes\Test;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CashierWebhookTest extends TestCase
{
    private const SECRET = 'whsec_test_secret_123';

    #[Test]
    public function webhook_with_invalid_signature_returns_403(): void
    {
        config()->set('cashier.webhook.secret', self::SECRET);

        $payload = json_encode([
            'id' => 'evt_invalid',
            'object' => 'event',
            'type' => 'customer.subscription.updated',
        ], JSON_THROW_ON_ERROR);

        $response = $this->withHeaders([
            'Stripe-Signature' => 't=1,v1=invalid-signature',
        ])->post('/api/stripe/webhook', [], [
            'CONTENT_TYPE' => 'application/json',
            'CONTENT_LENGTH' => strlen($payload),
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function webhook_with_valid_signature_returns_200_and_event_type(): void
    {
        config()->set('cashier.webhook.secret', self::SECRET);

        $payload = json_encode([
            'id' => 'evt_valid',
            'object' => 'event',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_123',
                    'object' => 'subscription',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $timestamp = time();
        $signedPayload = $timestamp . '.' . $payload;
        $signature = hash_hmac('sha256', $signedPayload, self::SECRET);
        $header = sprintf('t=%d,v1=%s', $timestamp, $signature);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $header,
            ],
            $payload,
        );

        $response->assertOk()->assertJson([
            'received' => true,
            'event' => 'customer.subscription.updated',
        ]);
    }

    #[Test]
    public function webhook_updates_subscription_state_and_syncs_addons(): void
    {
        config()->set('cashier.webhook.secret', self::SECRET);

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        DB::table('subscriptions')->insert([
            'tenant_id' => (string) $tenant->id,
            'type' => 'default',
            'stripe_id' => 'sub_lifecycle_sync',
            'stripe_status' => 'incomplete',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $activeAddon = Addon::query()->updateOrCreate(
            ['slug' => 'webhook-active-addon'],
            [
                'name' => 'Webhook Active Addon',
                'description' => 'Synced from webhook',
                'stripe_price_id' => 'price_webhook_active',
                'price_monthly' => 1200,
                'currency' => 'SEK',
                'feature_flag' => 'webhook_active',
                'is_active' => true,
                'sort_order' => 90,
            ]
        );

        $staleAddon = Addon::query()->updateOrCreate(
            ['slug' => 'webhook-stale-addon'],
            [
                'name' => 'Webhook Stale Addon',
                'description' => 'Should be deactivated',
                'stripe_price_id' => 'price_webhook_stale',
                'price_monthly' => 1400,
                'currency' => 'SEK',
                'feature_flag' => 'webhook_stale',
                'is_active' => true,
                'sort_order' => 91,
            ]
        );

        DB::table('tenant_addons')->insert([
            'tenant_id' => (string) $tenant->id,
            'addon_id' => $staleAddon->id,
            'stripe_subscription_item_id' => null,
            'activated_at' => now(),
            'deactivated_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $trialEnd = time() + 3600;
        $payloadArray = [
            'id' => 'evt_lifecycle',
            'object' => 'event',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_lifecycle_sync',
                    'object' => 'subscription',
                    'status' => 'active',
                    'trial_end' => $trialEnd,
                    'items' => [
                        'data' => [
                            ['price' => ['id' => 'price_webhook_active']],
                        ],
                    ],
                ],
            ],
        ];

        $payload = json_encode($payloadArray, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, self::SECRET);
        $header = sprintf('t=%d,v1=%s', $timestamp, $signature);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $header,
            ],
            $payload,
        );

        $response->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'stripe_id' => 'sub_lifecycle_sync',
            'stripe_status' => 'active',
        ]);

        $this->assertDatabaseHas('tenant_addons', [
            'tenant_id' => (string) $tenant->id,
            'addon_id' => $activeAddon->id,
            'deactivated_at' => null,
        ]);

        $this->assertNotNull(
            DB::table('tenant_addons')
                ->where('tenant_id', (string) $tenant->id)
                ->where('addon_id', $staleAddon->id)
                ->value('deactivated_at')
        );
    }
}
