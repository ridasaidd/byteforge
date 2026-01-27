<?php

namespace Database\Seeders;

use App\Models\Membership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Stancl\Tenancy\Database\Models\Domain;

class FixedTestDataSeeder extends Seeder
{
    /**
     * Seed fixed test data for development and testing.
     *
     * This creates:
     * - 3 fixed tenants (tenant_one, tenant_two, tenant_three)
     * - 2 fixed users (user_with_multiple_tenants, user_with_one_tenant)
     * - Memberships linking users to tenants
     */
    public function run(): void
    {
        // Disable activity logging during seeding
        activity()->disableLogging();

        // Create or get fixed tenants
        $tenantOne = Tenant::firstOrCreate(
            ['id' => 'tenant_one'],
            [
                'name' => 'Tenant One',
                'slug' => 'tenant-one',
                'domain' => 'tenant-one.byteforge.se',
                'email' => 'contact@tenant-one.byteforge.se',
                'phone' => '+46701234567',
                'status' => 'active',
            ]
        );

        $tenantTwo = Tenant::firstOrCreate(
            ['id' => 'tenant_two'],
            [
                'name' => 'Tenant Two',
                'slug' => 'tenant-two',
                'domain' => 'tenant-two.byteforge.se',
                'email' => 'contact@tenant-two.byteforge.se',
                'phone' => '+46701234568',
                'status' => 'active',
            ]
        );

        $tenantThree = Tenant::firstOrCreate(
            ['id' => 'tenant_three'],
            [
                'name' => 'Tenant Three',
                'slug' => 'tenant-three',
                'domain' => 'tenant-three.byteforge.se',
                'email' => 'contact@tenant-three.byteforge.se',
                'phone' => '+46701234569',
                'status' => 'active',
            ]
        );

        $this->command->info('✓ Created 3 fixed tenants');

        // Create domains for fixed tenants (idempotent)
        Domain::firstOrCreate(
            ['domain' => 'tenant-one.byteforge.se'],
            ['tenant_id' => $tenantOne->id]
        );

        Domain::firstOrCreate(
            ['domain' => 'tenant-two.byteforge.se'],
            ['tenant_id' => $tenantTwo->id]
        );

        Domain::firstOrCreate(
            ['domain' => 'tenant-three.byteforge.se'],
            ['tenant_id' => $tenantThree->id]
        );

        $this->command->info('✓ Created domains for fixed tenants');

        // Create or get fixed users
        $userMultiple = User::firstOrCreate(
            ['email' => 'user.multiple@byteforge.test'],
            [
                'name' => 'User With Multiple Tenants',
                'password' => Hash::make('password'),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );

        $userSingle = User::firstOrCreate(
            ['email' => 'user.single@byteforge.test'],
            [
                'name' => 'User With One Tenant',
                'password' => Hash::make('password'),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('✓ Created 2 fixed users');

        // Create memberships (idempotent)
        Membership::firstOrCreate(
            [
                'user_id' => $userMultiple->id,
                'tenant_id' => $tenantOne->id,
            ],
            [
                'role' => 'owner',
                'status' => 'active',
            ]
        );

        Membership::firstOrCreate(
            [
                'user_id' => $userMultiple->id,
                'tenant_id' => $tenantTwo->id,
            ],
            [
                'role' => 'owner',
                'status' => 'active',
            ]
        );

        Membership::firstOrCreate(
            [
                'user_id' => $userSingle->id,
                'tenant_id' => $tenantThree->id,
            ],
            [
                'role' => 'owner',
                'status' => 'active',
            ]
        );

        $this->command->info('✓ Created memberships');
        $this->command->info('');
        $this->command->info('Fixed test data summary:');
        $this->command->info("  - {$userMultiple->email} (password: password) owns:");
        $this->command->info("    • {$tenantOne->domain}");
        $this->command->info("    • {$tenantTwo->domain}");
        $this->command->info("  - {$userSingle->email} (password: password) owns:");
        $this->command->info("    • {$tenantThree->domain}");

        // Re-enable activity logging
        activity()->enableLogging();
    }
}
