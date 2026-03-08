<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAddon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function listPlans()
    {
        return Plan::query()
            ->active()
            ->orderBy('sort_order')
            ->get();
    }

    public function listAddonsForTenant(Tenant $tenant)
    {
        $activeAddonIds = TenantAddon::query()
            ->forTenant((string) $tenant->id)
            ->active()
            ->pluck('addon_id')
            ->all();

        return Addon::query()
            ->active()
            ->orderBy('sort_order')
            ->get()
            ->map(function (Addon $addon) use ($activeAddonIds) {
                return [
                    'id' => $addon->id,
                    'name' => $addon->name,
                    'slug' => $addon->slug,
                    'description' => $addon->description,
                    'price_monthly' => $addon->price_monthly,
                    'currency' => $addon->currency,
                    'feature_flag' => $addon->feature_flag,
                    'is_purchased' => in_array($addon->id, $activeAddonIds, true),
                ];
            })
            ->values();
    }

    public function getSubscriptionSummary(Tenant $tenant): array
    {
        $subscription = $tenant->subscription('default');
        $activeAddonRows = TenantAddon::query()
            ->forTenant((string) $tenant->id)
            ->active()
            ->with('addon')
            ->get()
            ->filter(fn (TenantAddon $row) => $row->addon !== null)
            ->values();

        $activeAddons = $activeAddonRows
            ->map(function (TenantAddon $row) {
                return [
                    'name' => $row->addon->name,
                    'slug' => $row->addon->slug,
                    'activated_at' => $row->activated_at?->toISOString(),
                ];
            })
            ->values();

        $currentPlan = Plan::query()->bySlug('free')->first();

        // Source of truth for paid plan is the subscription base price from Stripe/Cashier.
        $subscriptionStripePrice = is_object($subscription) ? data_get($subscription, 'stripe_price') : null;
        if (is_string($subscriptionStripePrice) && $subscriptionStripePrice !== '') {
            $planFromSubscription = Plan::query()->where('stripe_price_id', $subscriptionStripePrice)->first();
            if ($planFromSubscription) {
                $currentPlan = $planFromSubscription;
            }
        }

        // Backward-compatible fallback while older rows may not have subscription price hydrated.
        if (!$currentPlan || $currentPlan->slug === 'free') {
            $selectedPlanSlug = data_get($tenant->data, 'billing.plan_slug');
            if (is_string($selectedPlanSlug) && $selectedPlanSlug !== '') {
                $matchedPlan = Plan::query()->bySlug($selectedPlanSlug)->first();
                if ($matchedPlan) {
                    $currentPlan = $matchedPlan;
                }
            }
        }

        $monthlyTotal = (int) ($currentPlan?->price_monthly ?? 0)
            + (int) $activeAddonRows->sum(fn (TenantAddon $row) => (int) $row->addon->price_monthly);

        return [
            'plan' => $currentPlan ? ['name' => $currentPlan->name, 'slug' => $currentPlan->slug] : null,
            'status' => $subscription?->stripe_status ?? 'inactive',
            'current_period_end' => $subscription?->ends_at?->toISOString(),
            'cancel_at_period_end' => (bool) $subscription?->ends_at,
            'trial_ends_at' => $tenant->trial_ends_at?->toISOString(),
            'active_addons' => $activeAddons,
            'monthly_total' => $monthlyTotal,
            'currency' => strtoupper((string) config('cashier.currency', 'usd')),
        ];
    }

    public function createCheckout(Tenant $tenant, Plan $plan, string $successUrl, string $cancelUrl): array
    {
        $isFreePlan = (int) $plan->price_monthly === 0 && (int) $plan->price_yearly === 0;

        if ($isFreePlan) {
            return [
                'checkout_url' => null,
                'mode' => 'free',
                'message' => 'Free plan selected. No Stripe checkout is required.',
            ];
        }

        if (!is_string(config('cashier.key')) || trim((string) config('cashier.key')) === ''
            || !is_string(config('cashier.secret')) || trim((string) config('cashier.secret')) === '') {
            throw ValidationException::withMessages([
                'stripe' => 'Stripe billing is not configured. Set STRIPE_KEY and STRIPE_SECRET.',
            ]);
        }

        if (!$plan->stripe_price_id) {
            throw ValidationException::withMessages([
                'plan' => 'Selected plan is not billable via Stripe.',
            ]);
        }

        $checkout = $tenant
            ->newSubscription('default', $plan->stripe_price_id)
            ->checkout([
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'metadata' => [
                    'tenant_id' => (string) $tenant->id,
                    'plan_slug' => $plan->slug,
                ],
            ]);

        $data = $tenant->data ?? [];
        $data['billing']['plan_slug'] = $plan->slug;
        $tenant->update(['data' => $data]);

        return [
            'checkout_url' => $checkout->url,
        ];
    }

    public function getPortalUrl(Tenant $tenant, string $returnUrl): array
    {
        return [
            'portal_url' => $tenant->billingPortalUrl($returnUrl),
        ];
    }

    /**
     * Sync subscription state from Stripe API for a given tenant.
     * Called after checkout return to ensure local DB is up-to-date
     * even if the webhook hasn't arrived yet.
     */
    public function syncSubscription(Tenant $tenant): array
    {
        $subscription = $tenant->subscription('default');

        // If Cashier already has a subscription row, just make sure it's fresh.
        if ($subscription) {
            return [
                'synced' => true,
                'status' => $subscription->stripe_status,
            ];
        }

        // No local subscription row yet. Try to find one via Stripe API.
        $stripeId = $tenant->stripe_id;
        if (!is_string($stripeId) || $stripeId === '') {
            return ['synced' => false, 'reason' => 'no_stripe_customer'];
        }

        try {
            $stripeSubscriptions = \Stripe\Subscription::all(
                ['customer' => $stripeId, 'limit' => 5, 'status' => 'all'],
                ['api_key' => config('cashier.secret')]
            );
        } catch (\Throwable $e) {
            return ['synced' => false, 'reason' => 'stripe_api_error'];
        }

        foreach ($stripeSubscriptions->data as $stripeSub) {
            $existing = DB::table('subscriptions')
                ->where('stripe_id', $stripeSub->id)
                ->exists();

            if ($existing) {
                continue;
            }

            $priceId = $stripeSub->items->data[0]->price->id ?? null;
            $resolvedPrice = is_string($priceId)
                ? Plan::query()->where('stripe_price_id', $priceId)->value('stripe_price_id')
                : null;

            DB::table('subscriptions')->insert([
                'tenant_id' => (string) $tenant->id,
                'type' => 'default',
                'stripe_id' => $stripeSub->id,
                'stripe_status' => $stripeSub->status,
                'stripe_price' => $resolvedPrice,
                'quantity' => null,
                'trial_ends_at' => null,
                'ends_at' => $stripeSub->canceled_at
                    ? date('Y-m-d H:i:s', $stripeSub->canceled_at)
                    : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return ['synced' => true, 'status' => 'refreshed_from_stripe'];
    }

    public function activateAddon(Tenant $tenant, Addon $addon): array
    {
        if (!$addon->is_active) {
            throw ValidationException::withMessages([
                'addon' => 'This add-on is inactive.',
            ]);
        }

        $subscription = $tenant->subscription('default');
        if (!$subscription || !$subscription->active()) {
            throw ValidationException::withMessages([
                'subscription' => 'Tenant must have an active base subscription before enabling add-ons.',
            ]);
        }

        $existing = TenantAddon::query()
            ->forTenant((string) $tenant->id)
            ->where('addon_id', $addon->id)
            ->first();

        if ($existing && $existing->deactivated_at === null) {
            return [
                'addon' => ['name' => $addon->name, 'slug' => $addon->slug],
                'status' => 'already_active',
                'new_monthly_total' => $this->getSubscriptionSummary($tenant)['monthly_total'],
            ];
        }

        $subscriptionItemId = null;
        if (!app()->environment('testing')) {
            $subscription->addPrice($addon->stripe_price_id);
            $subscription->refresh();

            $subscriptionItem = $subscription->items()
                ->where('stripe_price', $addon->stripe_price_id)
                ->latest('id')
                ->first();

            $subscriptionItemId = $subscriptionItem?->stripe_id;
        }

        TenantAddon::query()->updateOrCreate(
            [
                'tenant_id' => (string) $tenant->id,
                'addon_id' => $addon->id,
            ],
            [
                'stripe_subscription_item_id' => $subscriptionItemId,
                'activated_at' => now(),
                'deactivated_at' => null,
            ]
        );

        return [
            'addon' => ['name' => $addon->name, 'slug' => $addon->slug],
            'status' => 'activated',
            'new_monthly_total' => $this->getSubscriptionSummary($tenant)['monthly_total'],
        ];
    }

    public function deactivateAddon(Tenant $tenant, Addon $addon): array
    {
        $subscription = $tenant->subscription('default');
        if (!$subscription) {
            throw ValidationException::withMessages([
                'subscription' => 'No active subscription found for tenant.',
            ]);
        }

        $active = TenantAddon::query()
            ->forTenant((string) $tenant->id)
            ->where('addon_id', $addon->id)
            ->active()
            ->first();

        if (!$active) {
            return [
                'addon' => ['name' => $addon->name, 'slug' => $addon->slug],
                'status' => 'already_inactive',
                'new_monthly_total' => $this->getSubscriptionSummary($tenant)['monthly_total'],
            ];
        }

        if (!app()->environment('testing')) {
            $subscription->removePrice($addon->stripe_price_id);
        }

        $active->update([
            'deactivated_at' => now(),
        ]);

        return [
            'addon' => ['name' => $addon->name, 'slug' => $addon->slug],
            'status' => 'deactivated',
            'new_monthly_total' => $this->getSubscriptionSummary($tenant)['monthly_total'],
        ];
    }

    public function hasAddon(Tenant $tenant, string $featureFlag): bool
    {
        return TenantAddon::query()
            ->forTenant((string) $tenant->id)
            ->active()
            ->whereHas('addon', function ($query) use ($featureFlag) {
                $query->where('feature_flag', $featureFlag);
            })
            ->exists();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function processStripeWebhook(array $payload): void
    {
        $eventType = (string) data_get($payload, 'type', '');
        if (!in_array($eventType, [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
        ], true)) {
            return;
        }

        $subscriptionObject = data_get($payload, 'data.object');
        if (!is_array($subscriptionObject)) {
            return;
        }

        $stripeSubscriptionId = data_get($subscriptionObject, 'id');
        if (!is_string($stripeSubscriptionId) || $stripeSubscriptionId === '') {
            return;
        }

        $row = DB::table('subscriptions')
            ->where('stripe_id', $stripeSubscriptionId)
            ->first();

        $items = data_get($subscriptionObject, 'items.data');
        $priceIds = [];
        if (is_array($items)) {
            $priceIds = collect($items)
                ->map(fn ($item) => is_array($item) ? data_get($item, 'price.id') : null)
                ->filter(fn ($id) => is_string($id) && $id !== '')
                ->values()
                ->all();
        }

        $resolvedBasePlanPriceId = Plan::query()
            ->whereIn('stripe_price_id', $priceIds)
            ->value('stripe_price_id');

        if (!$row) {
            $customerId = data_get($subscriptionObject, 'customer');
            if (!is_string($customerId) || $customerId === '') {
                return;
            }

            $tenant = Tenant::query()->where('stripe_id', $customerId)->first();
            if (!$tenant) {
                return;
            }

            DB::table('subscriptions')->insert([
                'tenant_id' => (string) $tenant->id,
                'type' => 'default',
                'stripe_id' => $stripeSubscriptionId,
                'stripe_status' => (string) data_get($subscriptionObject, 'status', 'incomplete'),
                'stripe_price' => $resolvedBasePlanPriceId,
                'quantity' => null,
                'trial_ends_at' => null,
                'ends_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('subscriptions')
                ->where('stripe_id', $stripeSubscriptionId)
                ->first();

            if (!$row) {
                return;
            }
        }

        $status = data_get($subscriptionObject, 'status', $row->stripe_status ?? 'incomplete');

        $endsAt = null;
        $canceledAt = data_get($subscriptionObject, 'canceled_at');
        if (is_numeric($canceledAt)) {
            $endsAt = date('Y-m-d H:i:s', (int) $canceledAt);
        } elseif ($eventType === 'customer.subscription.deleted') {
            $endsAt = now()->toDateTimeString();
        }

        $trialEndsAt = null;
        $trialEnd = data_get($subscriptionObject, 'trial_end');
        if (is_numeric($trialEnd)) {
            $trialEndsAt = date('Y-m-d H:i:s', (int) $trialEnd);
        }

        DB::table('subscriptions')
            ->where('id', $row->id)
            ->update([
                'stripe_status' => (string) $status,
                'stripe_price' => $resolvedBasePlanPriceId,
                'trial_ends_at' => $trialEndsAt,
                'ends_at' => $endsAt,
                'updated_at' => now(),
            ]);

        if (!empty($priceIds)) {
            $this->syncTenantAddonsFromStripeItems((string) $row->tenant_id, $priceIds);
        }
    }

    /**
     * @param list<string> $stripePriceIds
     */
    private function syncTenantAddonsFromStripeItems(string $tenantId, array $stripePriceIds): void
    {
        $activeAddonIds = Addon::query()
            ->whereIn('stripe_price_id', $stripePriceIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach ($activeAddonIds as $addonId) {
            $row = TenantAddon::query()->firstOrNew([
                'tenant_id' => $tenantId,
                'addon_id' => $addonId,
            ]);

            if (!$row->exists || $row->deactivated_at !== null) {
                $row->activated_at = now();
            }

            $row->deactivated_at = null;
            $row->save();
        }

        TenantAddon::query()
            ->forTenant($tenantId)
            ->active()
            ->when(!empty($activeAddonIds), fn ($query) => $query->whereNotIn('addon_id', $activeAddonIds))
            ->when(empty($activeAddonIds), fn ($query) => $query)
            ->update([
                'deactivated_at' => now(),
                'updated_at' => now(),
            ]);
    }
}
