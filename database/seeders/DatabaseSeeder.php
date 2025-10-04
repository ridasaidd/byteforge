<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            FixedTestDataSeeder::class, // Fixed test tenants and users
            UserSeeder::class,
            TenantSeeder::class,
            MembershipSeeder::class,
            PageSeeder::class,
            NavigationSeeder::class,
            DomainSeeder::class,
        ]);
    }
}
