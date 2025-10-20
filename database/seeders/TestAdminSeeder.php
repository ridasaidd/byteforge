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

        if (!$testAdmin) {
            $testAdmin = User::create([
                'name' => 'Test Admin',
                'email' => 'testadmin@byteforge.se',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'type' => 'superadmin',
            ]);

            // Assign superadmin role if it exists
            $superadminRole = Role::where('name', 'superadmin')
                ->where('guard_name', 'web')
                ->first();

            if ($superadminRole) {
                $testAdmin->assignRole($superadminRole);
            }

            $this->command->info('✓ Created test admin: testadmin@byteforge.se (password: password)');
        } else {
            $this->command->info('✓ Test admin already exists: testadmin@byteforge.se');
        }
    }
}
