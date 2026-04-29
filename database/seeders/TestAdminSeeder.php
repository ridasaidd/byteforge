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
        $email = 'testadmin@' . $this->centralDomain();

        // Check if test admin already exists
        $testAdmin = User::where('email', $email)->first();

        if (! $testAdmin) {
            $testAdmin = User::create([
                'name' => 'Test Admin',
                'email' => $email,
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'type' => 'superadmin',
            ]);
            $this->command->info(sprintf('✓ Created test admin: %s (password: password)', $email));
        } else {
            $this->command->info(sprintf('✓ Test admin already exists: %s', $email));
        }

    // Ensure superadmin role exists for api guard
    $superadminApi = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'api']);

    // Assign only the api role to the test admin (guard must match)
    $testAdmin->assignRole($superadminApi);
    }

    private function centralDomain(): string
    {
        $domains = config('tenancy.central_domains', []);

        if (is_string($domains)) {
            $domains = explode(',', $domains);
        }

        foreach ((array) $domains as $domain) {
            $candidate = trim((string) $domain);
            if ($candidate === '' || in_array($candidate, ['localhost', '127.0.0.1'], true)) {
                continue;
            }

            return $candidate;
        }

        return 'byteforge.se';
    }
}
