<?php

namespace Database\Seeders;

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
            PassportTestSeeder::class, // Passport personal access client (must run before auth tests)
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
