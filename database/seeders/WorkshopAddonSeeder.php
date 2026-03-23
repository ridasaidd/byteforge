<?php

namespace Database\Seeders;

use App\Models\Addon;
use Illuminate\Database\Seeder;

/**
 * Seeds the Addon catalog with the Workshop Directory addon.
 *
 * This addon enables a mechanic tenant to publish a workshop profile
 * to the central location-based search directory.
 *
 * Run independently: php artisan db:seed --class=WorkshopAddonSeeder
 */
class WorkshopAddonSeeder extends Seeder
{
    public function run(): void
    {
        Addon::firstOrCreate(
            ['slug' => 'workshop-directory'],
            [
                'name' => 'Workshop Directory',
                'description' => 'Publish your workshop to the location-based mechanic search directory. '
                    .'Customers can find your workshop by proximity, specialization, and ratings.',
                'stripe_price_id' => 'price_workshop_directory', // replace with real Stripe price ID
                'price_monthly' => 0,    // free tier – adjust when billing is configured
                'currency' => 'SEK',
                'feature_flag' => 'workshop_directory',
                'is_active' => true,
                'sort_order' => 10,
            ]
        );
    }
}
