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

class KlarnaPaymentFlowTest extends TestCase
{
    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    #[Test]
    public function create_session_returns_403_without_payments_manage(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertKlarnaProvider($tenant);

        $response = $this->actingAsTenantViewer('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/create-session'), $this->sessionPayload());

        $response->assertForbidden();
    }

    #[Test]
    public function create_session_returns_client_token_and_creates_pending_payment(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertKlarnaProvider($tenant);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/create-session'), $this->sessionPayload());

        $response->assertOk()->assertJsonStructure([
            'payment_id',
            'session_id',
            'client_token',
        ]);

        $paymentId = (int) $response->json('payment_id');

        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'tenant_id' => (string) $tenant->id,
            'provider' => 'klarna',
            'status' => Payment::STATUS_PENDING,
            'amount' => 19900,
            'currency' => 'SEK',
        ]);
    }

    #[Test]
    public function authorize_and_capture_flow_updates_payment_status_and_records_analytics(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $this->activatePaymentsAddonForTenant($tenant);
        $this->upsertKlarnaProvider($tenant);

        $create = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/create-session'), $this->sessionPayload());

        $create->assertOk();
        $paymentId = (int) $create->json('payment_id');

        $authorize = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/authorize'), [
                'payment_id' => $paymentId,
                'authorization_token' => 'auth_token_test_123',
            ]);

        $authorize->assertOk()->assertJsonPath('data.status', Payment::STATUS_PROCESSING);

        $capture = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/klarna/capture/' . $paymentId), [
                'amount' => 19900,
            ]);

        $capture->assertOk()->assertJsonPath('data.status', Payment::STATUS_COMPLETED);

        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'status' => Payment::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('analytics_events', [
            'tenant_id' => (string) $tenant->id,
            'event_type' => AnalyticsEvent::TYPE_PAYMENT_CAPTURED,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionPayload(): array
    {
        return [
            'amount' => 19900,
            'currency' => 'SEK',
            'locale' => 'sv-SE',
            'order_lines' => [
                [
                    'name' => 'Order item',
                    'quantity' => 1,
                    'unit_price' => 19900,
                    'tax_rate' => 2500,
                ],
            ],
        ];
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

    private function upsertKlarnaProvider(Tenant $tenant): TenantPaymentProvider
    {
        return TenantPaymentProvider::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'provider' => 'klarna',
            ],
            [
                'credentials' => [
                    'username' => 'PK_test_123456',
                    'password' => 'secret',
                    'api_region' => 'eu',
                    'playground' => true,
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );
    }
}
