<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class TestAdminSeeder extends Seeder
{
    /**
     * Seed a fixed test admin user for integration testing.
     * This user is used by Vitest integration tests.
     */
    public function run(): void
    {
        // Check if test admin already exists
        $testAdmin = User::where('email', 'testadmin@byteforge.se')->first();

        if (! $testAdmin) {
            $testAdmin = User::create([
                'name' => 'Test Admin',
                'email' => 'testadmin@byteforge.se',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'type' => 'superadmin',
            ]);
            $this->command->info('✓ Created test admin: testadmin@byteforge.se (password: password)');
        } else {
            $this->command->info('✓ Test admin already exists: testadmin@byteforge.se');
        }

    // Ensure superadmin role exists for api guard
    $superadminApi = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'api']);

    // Assign only the api role to the test admin (guard must match)
    $testAdmin->assignRole($superadminApi);
    }
}
