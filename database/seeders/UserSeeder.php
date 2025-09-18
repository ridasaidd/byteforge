<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Superadmins
        User::factory()->count(2)->create(['type' => 'superadmin']);
        // Tenant users
        User::factory()->count(10)->create(['type' => 'tenant_user']);
        // Customers
        User::factory()->count(20)->create(['type' => 'customer']);
    }
}
