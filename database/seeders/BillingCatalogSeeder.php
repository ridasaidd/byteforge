<?php

namespace Database\Seeders;

use App\Models\Addon;
use App\Models\Plan;
use Illuminate\Database\Seeder;

class BillingCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price_monthly' => 0,
                'price_yearly' => 0,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 5, 'max_media_mb' => 500, 'max_users' => 2, 'custom_domain' => false],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'stripe_price_id' => config('cashier.prices.starter') ?: null,
                'price_monthly' => 14900,
                'price_yearly' => 149000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 25, 'max_media_mb' => 5000, 'max_users' => 5, 'custom_domain' => true],
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'stripe_price_id' => config('cashier.prices.business') ?: null,
                'price_monthly' => 39900,
                'price_yearly' => 399000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 999999, 'max_media_mb' => 50000, 'max_users' => 999999, 'custom_domain' => true],
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        $addons = [
            [
                'name' => 'Booking System',
                'slug' => 'booking',
                'description' => 'Appointment scheduling, calendar, and booking management',
                'stripe_price_id' => env('STRIPE_PRICE_ADDON_BOOKING', 'price_booking_placeholder'),
                'price_monthly' => 9900,
                'currency' => 'SEK',
                'feature_flag' => 'booking',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Payment Processing',
                'slug' => 'payments',
                'description' => 'Stripe, Swish, and Klarna payment capabilities',
                'stripe_price_id' => env('STRIPE_PRICE_ADDON_PAYMENTS', 'price_payments_placeholder'),
                'price_monthly' => 7900,
                'currency' => 'SEK',
                'feature_flag' => 'payments',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Analytics Pro',
                'slug' => 'analytics-pro',
                'description' => 'Advanced analytics, exports, and custom reports',
                'stripe_price_id' => env('STRIPE_PRICE_ADDON_ANALYTICS_PRO', 'price_analytics_pro_placeholder'),
                'price_monthly' => 4900,
                'currency' => 'SEK',
                'feature_flag' => 'analytics_pro',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Priority Support',
                'slug' => 'priority-support',
                'description' => 'Fast-track support handling',
                'stripe_price_id' => env('STRIPE_PRICE_ADDON_PRIORITY_SUPPORT', 'price_priority_support_placeholder'),
                'price_monthly' => 9900,
                'currency' => 'SEK',
                'feature_flag' => 'priority_support',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Estimates and Quotes',
                'slug' => 'estimates-quotes',
                'description' => 'Request-first quote intake, tenant-authored quotes, and booking handoff',
                'stripe_price_id' => env('STRIPE_PRICE_ADDON_ESTIMATES_QUOTES', 'price_estimates_quotes_placeholder'),
                'price_monthly' => 8900,
                'currency' => 'SEK',
                'feature_flag' => 'estimates_quotes',
                'is_active' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($addons as $addon) {
            Addon::updateOrCreate(['slug' => $addon['slug']], $addon);
        }
    }
}
