<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        // Create 2 additional random tenants (we already have 3 fixed tenants)
        Tenant::factory()->count(2)->create();
    }
}
