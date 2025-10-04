<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Superadmins
        User::factory()->count(2)->create(['type' => 'superadmin'])->each(function ($user) {
            $user->assignRole('superadmin');
        });
        // Tenant users (we already have 2 fixed tenant users)
        User::factory()->count(5)->create(['type' => 'tenant_user']);
        // Customers
        User::factory()->count(10)->create(['type' => 'customer']);
    }
}
