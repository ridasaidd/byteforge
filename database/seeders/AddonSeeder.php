<?php

namespace Database\Seeders;

use App\Models\Addon;
use Illuminate\Database\Seeder;

class AddonSeeder extends Seeder
{
    public function run(): void
    {
        Addon::firstOrCreate(
            ['slug' => 'mechanic-workshop-directory'],
            [
                'name'           => 'Mechanic Workshop Directory',
                'description'    => 'Location-based search engine for car mechanic workshops. Enables customers to discover and book mechanics by proximity, city, or service type. Includes workshop listings, service catalogue, customer reviews, and a booking management system.',
                'stripe_price_id' => 'price_mechanic_workshop_directory', // Replace with real Stripe price ID
                'price_monthly'  => 49900, // 499 SEK per month in öre
                'currency'       => 'SEK',
                'feature_flag'   => 'mechanic_workshop_directory',
                'is_active'      => true,
                'sort_order'     => 10,
            ]
        );
    }
}
