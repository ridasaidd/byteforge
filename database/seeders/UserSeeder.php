<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        activity()->disableLogging();

        // Fixed Superadmin for Testing (Central Admin)
        $superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@byteforge.se',
            'password' => bcrypt('password'),
            'type' => 'superadmin',
            'email_verified_at' => now(),
        ]);
        $superadmin->assignRole('superadmin');

        // Additional random superadmins
        User::factory()->count(2)->create(['type' => 'superadmin'])->each(function ($user) {
            $user->assignRole('superadmin');
        });

        // Tenant users (we already have 2 fixed tenant users)
        User::factory()->count(5)->create(['type' => 'tenant_user']);

        // Customers
        User::factory()->count(10)->create(['type' => 'customer']);

        activity()->enableLogging();
    }
}
