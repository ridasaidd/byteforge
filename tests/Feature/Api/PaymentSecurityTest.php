<?php

namespace Tests\Feature\Api;

use App\Models\Addon;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Models\TenantPaymentProvider;
use App\Services\BillingService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Exploit tests — each test attempts to abuse a specific vulnerability
 * and asserts the fix blocks it.
 */
class PaymentSecurityTest extends TestCase
{
    // ──────────────────────────────────────────────────────────
    // 1. Klarna webhook forgery — bad HMAC must be rejected
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function klarna_webhook_with_wrong_hmac_is_rejected(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->upsertKlarnaProvider($tenant, webhookSecret: 'real-webhook-secret');

        $fakePayload = json_encode([
            'event_type' => 'order.completed',
            'order_id' => 'attacker-order-999',
            'status' => 'COMPLETED',
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            $this->tenantUrl('/api/payments/klarna/callback'),
            [], [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
                'HTTP_KLARNA_IDEMPOTENCY_KEY' => 'totally-fake-signature',
            ],
            $fakePayload,
        );

        $response->assertStatus(400);
        $response->assertJson(['message' => 'Invalid Klarna callback payload.']);
    }

    #[Test]
    public function klarna_webhook_without_hmac_header_is_rejected(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->upsertKlarnaProvider($tenant, webhookSecret: 'some-secret');

        $fakePayload = json_encode([
            'event_type' => 'order.completed',
            'order_id' => 'sneaky-order',
            'status' => 'COMPLETED',
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            $this->tenantUrl('/api/payments/klarna/callback'),
            [], [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
            ],
            $fakePayload,
        );

        $response->assertStatus(400);
    }

    // ──────────────────────────────────────────────────────────
    // 2. Swish webhook forgery — forged callback must be
    //    cross-verified against the Swish API, the callback
    //    status alone must not be trusted
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function swish_callback_for_nonexistent_payment_does_not_create_state(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertSwishProvider($tenant);

        $fakePayload = json_encode([
            'id' => '99999999-9999-9999-9999-999999999999',
            'status' => 'PAID',
            'payeePaymentReference' => 'attacker-ref',
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            $this->tenantUrl('/api/payments/swish/callback'),
            [], [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_HOST' => 'tenant-one.byteforge.se',
            ],
            $fakePayload,
        );

        // Should accept the callback (200) but not create or update any payment
        $response->assertOk();
        $this->assertDatabaseMissing('payments', [
            'provider_transaction_id' => '99999999-9999-9999-9999-999999999999',
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // 3. Klarna authorization_token path injection
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function klarna_authorize_rejects_path_traversal_in_token(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/authorize'), [
                'payment_id' => 1,
                'authorization_token' => '../../v1/sessions',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['authorization_token']);
    }

    #[Test]
    public function klarna_authorize_rejects_slashes_in_token(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/authorize'), [
                'payment_id' => 1,
                'authorization_token' => 'valid-looking/but-has-slash',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['authorization_token']);
    }

    // ──────────────────────────────────────────────────────────
    // 4. Open redirect via checkout URLs
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function checkout_rejects_external_success_url(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $this->mock(BillingService::class, function ($mock) {
            $mock->shouldReceive('listPlans')->andReturn(collect());
            $mock->shouldReceive('listAddonsForTenant')->andReturn(collect());
            $mock->shouldReceive('getSubscriptionSummary')->andReturn([]);
            $mock->shouldReceive('getPortalUrl')->andReturn(['portal_url' => 'https://billing.test/portal']);
            $mock->shouldReceive('createCheckout')->never();
        });

        $response = $this->actingAsSuperadmin()
            ->postJson('/api/superadmin/billing/checkout', [
                'tenant_id' => (string) $tenant->id,
                'plan_slug' => 'free',
                'success_url' => 'https://evil-site.com/steal-session',
                'cancel_url' => 'https://byteforge.se/cancel',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['url']);
    }

    #[Test]
    public function checkout_rejects_external_cancel_url(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $this->mock(BillingService::class, function ($mock) {
            $mock->shouldReceive('listPlans')->andReturn(collect());
            $mock->shouldReceive('listAddonsForTenant')->andReturn(collect());
            $mock->shouldReceive('getSubscriptionSummary')->andReturn([]);
            $mock->shouldReceive('getPortalUrl')->andReturn(['portal_url' => 'https://billing.test/portal']);
            $mock->shouldReceive('createCheckout')->never();
        });

        $response = $this->actingAsSuperadmin()
            ->postJson('/api/superadmin/billing/checkout', [
                'tenant_id' => (string) $tenant->id,
                'plan_slug' => 'free',
                'success_url' => 'https://byteforge.se/success',
                'cancel_url' => 'https://attacker.com/phish',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['url']);
    }

    #[Test]
    public function checkout_allows_subdomain_urls(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $this->mock(BillingService::class, function ($mock) {
            $mock->shouldReceive('createCheckout')
                ->once()
                ->andReturn(['checkout_url' => 'https://checkout.stripe.test/cs_123']);
            $mock->shouldReceive('listPlans')->andReturn(collect());
            $mock->shouldReceive('listAddonsForTenant')->andReturn(collect());
            $mock->shouldReceive('getSubscriptionSummary')->andReturn([]);
            $mock->shouldReceive('getPortalUrl')->andReturn(['portal_url' => 'https://billing.test/portal']);
        });

        \App\Models\Plan::query()->updateOrCreate(
            ['slug' => 'sec-test-plan'],
            [
                'name' => 'Security Test Plan',
                'stripe_price_id' => 'price_sec_test',
                'price_monthly' => 999,
                'price_yearly' => 9999,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 1],
                'is_active' => true,
                'sort_order' => 99,
            ]
        );

        $response = $this->actingAsSuperadmin()
            ->postJson('/api/superadmin/billing/checkout', [
                'tenant_id' => (string) $tenant->id,
                'plan_slug' => 'sec-test-plan',
                'success_url' => 'https://tenant-one.byteforge.se/billing/success',
                'cancel_url' => 'https://admin.byteforge.se/billing/cancel',
            ]);

        $response->assertOk();
    }

    #[Test]
    public function portal_rejects_external_return_url(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $response = $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/billing/portal?tenant_id=' . $tenant->id . '&return_url=https://evil.com/steal');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['url']);
    }

    // ──────────────────────────────────────────────────────────
    // 5. Refund overflow — refunding more than paid amount
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function refund_rejects_amount_exceeding_refundable_balance(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);

        TenantPaymentProvider::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'provider' => 'stripe'],
            [
                'credentials' => [
                    'publishable_key' => 'pk_test_exploit',
                    'secret_key' => 'sk_test_exploit',
                    'webhook_secret' => 'whsec_exploit',
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_test_overrefund',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 10000,
            'currency' => 'SEK',
            'paid_at' => now(),
        ]);

        // First refund: 7000 of 10000 — should succeed
        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl("/api/payments/{$payment->id}/refund"), [
                'amount' => 7000,
                'reason' => 'Partial refund',
            ]);

        $response->assertOk();

        // Second refund: 5000 — only 3000 remains, should be rejected
        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl("/api/payments/{$payment->id}/refund"), [
                'amount' => 5000,
                'reason' => 'Over-refund attempt',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['amount']);
    }

    // ──────────────────────────────────────────────────────────
    // 6. Metadata bomb — oversized metadata must be rejected
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function stripe_intent_rejects_oversized_metadata(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);

        // Build metadata with 25 keys (max is 20)
        $hugeMetadata = [];
        for ($i = 0; $i < 25; $i++) {
            $hugeMetadata["key_{$i}"] = "value_{$i}";
        }

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/stripe/create-intent'), [
                'amount' => 5000,
                'currency' => 'SEK',
                'metadata' => $hugeMetadata,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['metadata']);
    }

    // ──────────────────────────────────────────────────────────
    // 7. Plans route requires permission
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function plans_endpoint_requires_view_billing_permission(): void
    {
        // viewer does not have 'view billing' — should be forbidden
        $response = $this->actingAsCentralViewer()
            ->getJson('/api/superadmin/billing/plans');

        $response->assertForbidden();
    }

    #[Test]
    public function plans_endpoint_accessible_with_view_billing_permission(): void
    {
        $response = $this->actingAsSuperadmin()
            ->getJson('/api/superadmin/billing/plans');

        $response->assertOk();
    }

    // ──────────────────────────────────────────────────────────
    // 8. Swish status endpoint rejects non-UUID
    // ──────────────────────────────────────────────────────────

    #[Test]
    public function swish_status_rejects_non_uuid_id(): void
    {
        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/payments/swish/../../etc/passwd/status'));

        $response->assertNotFound();
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
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
            ['tenant_id' => (string) $tenant->id, 'provider' => 'swish'],
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

    private function upsertKlarnaProvider(Tenant $tenant, string $webhookSecret = ''): TenantPaymentProvider
    {
        return TenantPaymentProvider::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'provider' => 'klarna'],
            [
                'credentials' => [
                    'username' => 'PK_test_exploit',
                    'password' => 'test_secret',
                    'webhook_secret' => $webhookSecret,
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );
    }
}
