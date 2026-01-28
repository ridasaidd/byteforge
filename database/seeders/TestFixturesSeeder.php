<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Stancl\Tenancy\Database\Models\Domain;

class TestFixturesSeeder extends Seeder
{
    /**
     * Seed test fixtures for a clean, predictable test environment.
     *
     * Creates:
     * - 3 fixed tenants (tenant-one, tenant-two, tenant-three)
     * - Central app users with different roles (superadmin, editor, manager, viewer)
     * - Tenant users for each tenant
     */
    public function run(): void
    {
        // Disable activity logging during seeding
        activity()->disableLogging();

        // Ensure roles and permissions exist first
        $this->call(RolePermissionSeeder::class);

        echo "Creating test tenants...\n";

        // 1. Create fixed tenants (matching domain provider subdomains)
        $tenantOne = Tenant::firstOrCreate(
            ['id' => 'tenant_one'],
            [
                'name' => 'Tenant One',
                'slug' => 'tenant-one',
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
                'email' => 'contact@tenant-three.byteforge.se',
                'phone' => '+46701234569',
                'status' => 'active',
            ]
        );

        $this->command->info('✓ Created 3 fixed tenants');

        // 2. Create domains for tenants
        foreach ([
            ['tenant_one', 'tenant-one.byteforge.se'],
            ['tenant_two', 'tenant-two.byteforge.se'],
            ['tenant_three', 'tenant-three.byteforge.se'],
        ] as [$tenantId, $domain]) {
            Domain::firstOrCreate(
                ['domain' => $domain],
                ['tenant_id' => $tenantId]
            );
        }

        $this->command->info('✓ Created domains for tenants');

        echo "\nCreating central app users...\n";

        // 3. Create central app users with specific roles
        $superadminRole = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
        $adminRole = Role::where('name', 'admin')->where('guard_name', 'api')->first();
        $supportRole = Role::where('name', 'support')->where('guard_name', 'api')->first();
        $viewerRole = Role::where('name', 'viewer')->where('guard_name', 'api')->first();

        // Superadmin
        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@byteforge.se'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'type' => 'superadmin',
                'email_verified_at' => now(),
            ]
        );
        $superadmin->syncRoles([$superadminRole]);
        $this->command->info('✓ Created superadmin@byteforge.se');

        // Admin/Editor
        $editor = User::firstOrCreate(
            ['email' => 'editor@byteforge.se'],
            [
                'name' => 'Editor',
                'password' => Hash::make('password'),
                'type' => 'superadmin',
                'email_verified_at' => now(),
            ]
        );
        $editor->syncRoles([$adminRole]);
        $this->command->info('✓ Created editor@byteforge.se (admin role)');

        // Manager/Support
        $manager = User::firstOrCreate(
            ['email' => 'manager@byteforge.se'],
            [
                'name' => 'Manager',
                'password' => Hash::make('password'),
                'type' => 'superadmin',
                'email_verified_at' => now(),
            ]
        );
        $manager->syncRoles([$supportRole]);
        $this->command->info('✓ Created manager@byteforge.se (support role)');

        // Viewer
        $viewer = User::firstOrCreate(
            ['email' => 'viewer@byteforge.se'],
            [
                'name' => 'Viewer',
                'password' => Hash::make('password'),
                'type' => 'superadmin',
                'email_verified_at' => now(),
            ]
        );
        $viewer->syncRoles([$viewerRole]);
        $this->command->info('✓ Created viewer@byteforge.se (viewer role)');

        echo "\nCreating tenant users with different roles...\n";

        // 4. Create tenant users with different roles/permissions within each tenant context
        
        // Tenant One: Create owner/admin user with full permissions
        tenancy()->initialize($tenantOne);
        $tenantOneOwner = User::firstOrCreate(
            ['email' => 'owner.tenant-one@byteforge.se'],
            [
                'name' => 'Owner - Tenant One',
                'password' => Hash::make('password'),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );
        $tenantOneOwner->syncPermissions(['themes.manage', 'themes.view']);
        $this->command->info('✓ Created owner.tenant-one@byteforge.se (with themes.manage, themes.view)');
        tenancy()->end();

        // Tenant Two: Create editor user with limited permissions (view only)
        tenancy()->initialize($tenantTwo);
        $tenantTwoEditor = User::firstOrCreate(
            ['email' => 'editor.tenant-two@byteforge.se'],
            [
                'name' => 'Editor - Tenant Two',
                'password' => Hash::make('password'),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );
        $tenantTwoEditor->syncPermissions(['themes.view']);
        $this->command->info('✓ Created editor.tenant-two@byteforge.se (with themes.view only)');
        tenancy()->end();

        // Tenant Three: Create admin user with full permissions
        tenancy()->initialize($tenantThree);
        $tenantThreeAdmin = User::firstOrCreate(
            ['email' => 'admin.tenant-three@byteforge.se'],
            [
                'name' => 'Admin - Tenant Three',
                'password' => Hash::make('password'),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );
        $tenantThreeAdmin->syncPermissions(['themes.manage', 'themes.view']);
        $this->command->info('✓ Created admin.tenant-three@byteforge.se (with themes.manage, themes.view)');
        tenancy()->end();

        echo "\n✅ Test fixtures created successfully!\n";
        echo "\nCentral App Users:\n";
        echo "  - superadmin@byteforge.se (superadmin role)\n";
        echo "  - editor@byteforge.se (admin role)\n";
        echo "  - manager@byteforge.se (support role)\n";
        echo "  - viewer@byteforge.se (viewer role)\n";
        echo "\nTenant Users (with pre-configured permissions):\n";
        echo "  - owner.tenant-one@byteforge.se (themes.manage, themes.view)\n";
        echo "  - editor.tenant-two@byteforge.se (themes.view only)\n";
        echo "  - admin.tenant-three@byteforge.se (themes.manage, themes.view)\n";

        // Re-enable activity logging
        activity()->enableLogging();
    }
}
