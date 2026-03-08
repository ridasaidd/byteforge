<?php

namespace Tests\Feature\Api;

use App\Models\Addon;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Services\BillingService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BillingControllerTest extends TestCase
{
    #[Test]
    public function plans_requires_authentication(): void
    {
        $response = $this->getJson('/api/superadmin/billing/plans');

        $response->assertUnauthorized();
    }

    #[Test]
    public function superadmin_can_list_plans(): void
    {
        Plan::query()->updateOrCreate(
            ['slug' => 'controller-plan'],
            [
                'name' => 'Controller Plan',
                'price_monthly' => 1000,
                'price_yearly' => 10000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 3],
                'is_active' => true,
                'sort_order' => 50,
            ]
        );

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/billing/plans');

        $response->assertOk()->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'slug', 'price_monthly', 'price_yearly', 'currency', 'limits'],
            ],
        ]);
    }

    #[Test]
    public function viewer_cannot_view_subscription(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $response = $this->actingAsCentralViewer()->getJson('/api/superadmin/billing/subscription?tenant_id=' . $tenant->id);

        $response->assertForbidden();
    }

    #[Test]
    public function superadmin_can_view_addons_for_tenant(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        Addon::query()->updateOrCreate(
            ['slug' => 'controller-addon'],
            [
                'name' => 'Controller Addon',
                'description' => 'Controller test addon',
                'stripe_price_id' => 'price_controller_addon',
                'price_monthly' => 1200,
                'currency' => 'SEK',
                'feature_flag' => 'controller_addon',
                'is_active' => true,
                'sort_order' => 55,
            ]
        );

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/billing/addons?tenant_id=' . $tenant->id);

        $response->assertOk()->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'slug', 'description', 'price_monthly', 'currency', 'feature_flag', 'is_purchased'],
            ],
        ]);
    }

    #[Test]
    public function superadmin_can_view_subscription_summary(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/billing/subscription?tenant_id=' . $tenant->id);

        $response->assertOk()->assertJsonStructure([
            'data' => [
                'plan',
                'status',
                'current_period_end',
                'cancel_at_period_end',
                'trial_ends_at',
                'active_addons',
                'monthly_total',
            ],
        ]);
    }

    #[Test]
    public function viewer_cannot_create_checkout_session(): void
    {
        $response = $this->actingAsCentralViewer()->postJson('/api/superadmin/billing/checkout', [
            'tenant_id' => 'tenant_one',
            'plan_slug' => 'starter',
            'success_url' => 'https://byteforge.se/success',
            'cancel_url' => 'https://byteforge.se/cancel',
        ]);

        $response->assertForbidden();
    }

    #[Test]
    public function superadmin_checkout_requires_required_fields(): void
    {
        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/billing/checkout', []);

        $response->assertStatus(422)->assertJsonValidationErrors([
            'tenant_id',
            'plan_slug',
            'success_url',
            'cancel_url',
        ]);
    }

    #[Test]
    public function viewer_cannot_toggle_addon(): void
    {
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'toggle-protected-addon'],
            [
                'name' => 'Toggle Protected Addon',
                'description' => 'Addon for permission check',
                'stripe_price_id' => 'price_toggle_protected',
                'price_monthly' => 1300,
                'currency' => 'SEK',
                'feature_flag' => 'toggle_protected_addon',
                'is_active' => true,
                'sort_order' => 56,
            ]
        );

        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $response = $this->actingAsCentralViewer()->postJson('/api/superadmin/billing/addons/' . $addon->slug . '/activate?tenant_id=' . $tenant->id);

        $response->assertForbidden();
    }

    #[Test]
    public function superadmin_checkout_returns_checkout_url_when_service_succeeds(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        Plan::query()->updateOrCreate(
            ['slug' => 'checkout-plan'],
            [
                'name' => 'Checkout Plan',
                'stripe_price_id' => 'price_checkout_plan',
                'price_monthly' => 1400,
                'price_yearly' => 14000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 3],
                'is_active' => true,
                'sort_order' => 58,
            ]
        );

        $this->mock(BillingService::class, function ($mock) {
            $mock->shouldReceive('createCheckout')
                ->once()
                ->andReturn(['checkout_url' => 'https://checkout.stripe.test/cs_123']);

            $mock->shouldReceive('listPlans')->andReturn(collect());
            $mock->shouldReceive('listAddonsForTenant')->andReturn(collect());
            $mock->shouldReceive('getSubscriptionSummary')->andReturn([]);
            $mock->shouldReceive('getPortalUrl')->andReturn(['portal_url' => 'https://billing.test/portal']);
        });

        $response = $this->actingAsSuperadmin()->postJson('/api/superadmin/billing/checkout', [
            'tenant_id' => (string) $tenant->id,
            'plan_slug' => 'checkout-plan',
            'success_url' => 'https://byteforge.se/success',
            'cancel_url' => 'https://byteforge.se/cancel',
        ]);

        $response->assertOk()->assertJson([
            'checkout_url' => 'https://checkout.stripe.test/cs_123',
        ]);
    }

    #[Test]
    public function viewer_cannot_access_billing_portal_endpoint(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $response = $this->actingAsCentralViewer()->getJson('/api/superadmin/billing/portal?tenant_id=' . $tenant->id . '&return_url=https://byteforge.se/back');

        $response->assertForbidden();
    }

    #[Test]
    public function superadmin_portal_returns_portal_url_when_service_succeeds(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $this->mock(BillingService::class, function ($mock) {
            $mock->shouldReceive('getPortalUrl')
                ->once()
                ->andReturn(['portal_url' => 'https://billing.test/portal']);

            $mock->shouldReceive('listPlans')->andReturn(collect());
            $mock->shouldReceive('listAddonsForTenant')->andReturn(collect());
            $mock->shouldReceive('getSubscriptionSummary')->andReturn([]);
            $mock->shouldReceive('createCheckout')->andReturn(['checkout_url' => 'https://checkout.stripe.test/cs_123']);
        });

        $response = $this->actingAsSuperadmin()->getJson('/api/superadmin/billing/portal?tenant_id=' . $tenant->id . '&return_url=https://byteforge.se/back');

        $response->assertOk()->assertJson([
            'portal_url' => 'https://billing.test/portal',
        ]);
    }

    #[Test]
    public function superadmin_can_activate_and_deactivate_addon_for_tenant(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'controller-activate-addon'],
            [
                'name' => 'Controller Activate Addon',
                'description' => 'Activation flow addon',
                'stripe_price_id' => 'price_controller_activate_addon',
                'price_monthly' => 2200,
                'currency' => 'SEK',
                'feature_flag' => 'controller_activate_addon',
                'is_active' => true,
                'sort_order' => 59,
            ]
        );

        \Illuminate\Support\Facades\DB::table('subscriptions')->insert([
            'tenant_id' => (string) $tenant->id,
            'type' => 'default',
            'stripe_id' => 'sub_controller_activate',
            'stripe_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $activate = $this->actingAsSuperadmin()->postJson('/api/superadmin/billing/addons/' . $addon->slug . '/activate?tenant_id=' . $tenant->id);
        $activate->assertOk()->assertJsonPath('data.status', 'activated');

        $this->assertDatabaseHas('tenant_addons', [
            'tenant_id' => (string) $tenant->id,
            'addon_id' => $addon->id,
            'deactivated_at' => null,
        ]);

        $deactivate = $this->actingAsSuperadmin()->postJson('/api/superadmin/billing/addons/' . $addon->slug . '/deactivate?tenant_id=' . $tenant->id);
        $deactivate->assertOk()->assertJsonPath('data.status', 'deactivated');

        $this->assertNotNull(
            TenantAddon::query()->where('tenant_id', (string) $tenant->id)->where('addon_id', $addon->id)->first()?->deactivated_at
        );
    }
}
