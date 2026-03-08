<?php

namespace Tests\Unit\Services;

use App\Models\Addon;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Services\BillingService;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BillingServiceTest extends TestCase
{
    private BillingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(BillingService::class);
    }

    #[Test]
    public function it_lists_only_active_plans_sorted_by_sort_order(): void
    {
        Plan::query()->updateOrCreate(
            ['slug' => 'active-low'],
            [
                'name' => 'Active Low',
                'price_monthly' => 100,
                'price_yearly' => 1000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 1],
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        Plan::query()->updateOrCreate(
            ['slug' => 'inactive-plan'],
            [
                'name' => 'Inactive',
                'price_monthly' => 100,
                'price_yearly' => 1000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 1],
                'is_active' => false,
                'sort_order' => 0,
            ]
        );

        Plan::query()->updateOrCreate(
            ['slug' => 'active-high'],
            [
                'name' => 'Active High',
                'price_monthly' => 200,
                'price_yearly' => 2000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 10],
                'is_active' => true,
                'sort_order' => 9,
            ]
        );

        $plans = $this->service->listPlans();

        $this->assertGreaterThanOrEqual(2, $plans->count());
        $this->assertEquals('active-low', $plans->firstWhere('slug', 'active-low')?->slug);
        $this->assertNull($plans->firstWhere('slug', 'inactive-plan'));
    }

    #[Test]
    public function it_marks_purchased_addons_for_a_tenant(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'billing-test-addon'],
            [
                'name' => 'Billing Test Addon',
                'description' => 'Test',
                'stripe_price_id' => 'price_test_addon',
                'price_monthly' => 1234,
                'currency' => 'SEK',
                'feature_flag' => 'billing_test_addon',
                'is_active' => true,
                'sort_order' => 100,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            [
                'activated_at' => now(),
                'deactivated_at' => null,
            ]
        );

        $addons = $this->service->listAddonsForTenant($tenant);
        $selected = $addons->firstWhere('slug', 'billing-test-addon');

        $this->assertNotNull($selected);
        $this->assertTrue((bool) $selected['is_purchased']);
    }

    #[Test]
    public function it_reports_has_addon_by_feature_flag(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'billing-has-addon'],
            [
                'name' => 'Billing Has Addon',
                'description' => 'Test',
                'stripe_price_id' => 'price_has_addon',
                'price_monthly' => 999,
                'currency' => 'SEK',
                'feature_flag' => 'billing_has_addon',
                'is_active' => true,
                'sort_order' => 101,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            [
                'activated_at' => now(),
                'deactivated_at' => null,
            ]
        );

        $this->assertTrue($this->service->hasAddon($tenant, 'billing_has_addon'));
        $this->assertFalse($this->service->hasAddon($tenant, 'missing_feature'));
    }

    #[Test]
    public function it_builds_subscription_summary_with_selected_plan_and_addons(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        Plan::query()->updateOrCreate(
            ['slug' => 'summary-plan'],
            [
                'name' => 'Summary Plan',
                'price_monthly' => 5000,
                'price_yearly' => 50000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 5],
                'is_active' => true,
                'sort_order' => 5,
            ]
        );

        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'summary-addon'],
            [
                'name' => 'Summary Addon',
                'description' => 'Test',
                'stripe_price_id' => 'price_summary_addon',
                'price_monthly' => 2000,
                'currency' => 'SEK',
                'feature_flag' => 'summary_addon',
                'is_active' => true,
                'sort_order' => 102,
            ]
        );

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            [
                'activated_at' => now(),
                'deactivated_at' => null,
            ]
        );

        $summary = $this->service->getSubscriptionSummary($tenant->fresh());

        $this->assertEquals('free', $summary['plan']['slug']);
        $this->assertEquals(2000, $summary['monthly_total']);
        $this->assertEquals('inactive', $summary['status']);
        $this->assertArrayHasKey('currency', $summary);
    }

    #[Test]
    public function it_prefers_subscription_stripe_price_when_resolving_current_plan(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        Plan::query()->updateOrCreate(
            ['slug' => 'starter-summary-plan'],
            [
                'name' => 'Starter Summary Plan',
                'stripe_price_id' => 'price_summary_starter',
                'price_monthly' => 14900,
                'price_yearly' => 149000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 25],
                'is_active' => true,
                'sort_order' => 20,
            ]
        );

        DB::table('subscriptions')->insert([
            'tenant_id' => (string) $tenant->id,
            'type' => 'default',
            'stripe_id' => 'sub_summary_plan_resolution',
            'stripe_status' => 'active',
            'stripe_price' => 'price_summary_starter',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $summary = $this->service->getSubscriptionSummary($tenant->fresh());

        $this->assertEquals('starter-summary-plan', $summary['plan']['slug']);
        $this->assertEquals(14900, $summary['monthly_total']);
        $this->assertEquals('active', $summary['status']);
    }

    #[Test]
    public function it_activates_addon_and_creates_tenant_addon_row(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'activate-addon'],
            [
                'name' => 'Activate Addon',
                'description' => 'Test',
                'stripe_price_id' => 'price_activate_addon',
                'price_monthly' => 500,
                'currency' => 'SEK',
                'feature_flag' => 'activate_addon',
                'is_active' => true,
                'sort_order' => 500,
            ]
        );

        DB::table('subscriptions')->insert([
            'tenant_id' => (string) $tenant->id,
            'type' => 'default',
            'stripe_id' => 'sub_activate_test',
            'stripe_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $result = $this->service->activateAddon($tenant, $addon);

        $this->assertEquals('activated', $result['status']);
        $this->assertDatabaseHas('tenant_addons', [
            'tenant_id' => (string) $tenant->id,
            'addon_id' => $addon->id,
            'deactivated_at' => null,
        ]);
    }

    #[Test]
    public function it_deactivates_addon_and_sets_deactivated_at(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();
        $addon = Addon::query()->updateOrCreate(
            ['slug' => 'deactivate-addon'],
            [
                'name' => 'Deactivate Addon',
                'description' => 'Test',
                'stripe_price_id' => 'price_deactivate_addon',
                'price_monthly' => 700,
                'currency' => 'SEK',
                'feature_flag' => 'deactivate_addon',
                'is_active' => true,
                'sort_order' => 501,
            ]
        );

        DB::table('subscriptions')->insert([
            'tenant_id' => (string) $tenant->id,
            'type' => 'default',
            'stripe_id' => 'sub_deactivate_test',
            'stripe_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        TenantAddon::query()->updateOrCreate(
            ['tenant_id' => (string) $tenant->id, 'addon_id' => $addon->id],
            ['activated_at' => now(), 'deactivated_at' => null]
        );

        $result = $this->service->deactivateAddon($tenant, $addon);

        $this->assertEquals('deactivated', $result['status']);
        $this->assertDatabaseHas('tenant_addons', [
            'tenant_id' => (string) $tenant->id,
            'addon_id' => $addon->id,
        ]);
        $this->assertNotNull(
            TenantAddon::query()->where('tenant_id', (string) $tenant->id)->where('addon_id', $addon->id)->first()?->deactivated_at
        );
    }

    #[Test]
    public function it_allows_selecting_free_plan_without_stripe_checkout(): void
    {
        $tenant = Tenant::query()->where('slug', 'tenant-one')->firstOrFail();

        $plan = Plan::query()->updateOrCreate(
            ['slug' => 'free-checkout'],
            [
                'name' => 'Free Checkout',
                'stripe_price_id' => null,
                'price_monthly' => 0,
                'price_yearly' => 0,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 1],
                'is_active' => true,
                'sort_order' => 900,
            ]
        );

        $result = $this->service->createCheckout(
            $tenant,
            $plan,
            'https://byteforge.se/dashboard/billing?checkout=success',
            'https://byteforge.se/dashboard/billing?checkout=cancel'
        );

        $this->assertArrayHasKey('checkout_url', $result);
        $this->assertNull($result['checkout_url']);
        $this->assertSame('free', $result['mode']);
    }
}
