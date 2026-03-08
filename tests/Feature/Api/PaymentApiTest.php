<?php

namespace Tests\Feature\Api;

use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantPaymentProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    private function tenantUrl(string $path, string $slug = 'tenant-one'): string
    {
        return "http://{$slug}.byteforge.se{$path}";
    }

    #[Test]
    public function index_is_scoped_to_tenant_and_supports_filters(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        Payment::query()->create([
            'tenant_id' => (string) $tenantOne->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_filter_1',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 10000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        Payment::query()->create([
            'tenant_id' => (string) $tenantOne->id,
            'provider' => 'swish',
            'provider_transaction_id' => 'sw_filter_1',
            'status' => Payment::STATUS_PENDING,
            'amount' => 9000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        Payment::query()->create([
            'tenant_id' => (string) $tenantTwo->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_other_tenant',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 5000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/payments?status=completed&provider=stripe'));

        $response->assertOk();
        $items = $response->json('data');

        $this->assertCount(1, $items);
        $this->assertSame('pi_filter_1', $items[0]['provider_transaction_id']);
    }

    #[Test]
    public function show_includes_refunds_and_is_tenant_scoped(): void
    {
        $tenantOne = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $tenantTwo = Tenant::query()->where('slug', 'tenant-two')->firstOrFail();

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenantOne->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_show_1',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 12000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        $payment->refunds()->create([
            'tenant_id' => (string) $tenantOne->id,
            'provider_refund_id' => 're_show_1',
            'amount' => 2000,
            'reason' => 'Test refund',
            'status' => 'completed',
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/payments/' . $payment->id));

        $response->assertOk();
        $response->assertJsonPath('data.id', $payment->id);
        $this->assertNotEmpty($response->json('data.refunds'));

        $foreignPayment = Payment::query()->create([
            'tenant_id' => (string) $tenantTwo->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_show_2',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 5000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        $forbidden = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/payments/' . $foreignPayment->id));

        $forbidden->assertStatus(404);
    }

    #[Test]
    public function refund_requires_permission_and_owner_can_refund(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        TenantPaymentProvider::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'provider' => 'stripe'],
            [
                'credentials' => [
                    'publishable_key' => 'pk_test_1234567890abc',
                    'secret_key' => 'sk_test_1234567890xyz',
                    'webhook_secret' => 'whsec_123',
                ],
                'is_active' => true,
                'mode' => 'test',
            ]
        );

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'stripe',
            'provider_transaction_id' => 'pi_refund_api_1',
            'status' => Payment::STATUS_COMPLETED,
            'amount' => 10000,
            'currency' => 'SEK',
            'metadata' => [],
        ]);

        $forbidden = $this->actingAsTenantEditor()
            ->postJson($this->tenantUrl('/api/payments/' . $payment->id . '/refund'), [
                'amount' => 5000,
                'reason' => 'No permission',
            ]);

        $forbidden->assertForbidden();

        $ok = $this->actingAsTenantOwner('tenant-one')
            ->postJson($this->tenantUrl('/api/payments/' . $payment->id . '/refund'), [
                'amount' => 5000,
                'reason' => 'Partial refund',
            ]);

        $ok->assertOk();
        $ok->assertJsonPath('data.payment_id', $payment->id);

        $this->assertDatabaseHas('refunds', [
            'payment_id' => $payment->id,
            'amount' => 5000,
            'status' => 'completed',
        ]);
    }
}
