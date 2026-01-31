<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Stancl\Tenancy\Database\Models\Domain;

/**
 * TestFixturesSeeder - Creates a complete test environment
 *
 * All passwords are 'password' for easy testing.
 *
 * CENTRAL USERS:
 *   - superadmin@byteforge.se (superadmin role - full access)
 *   - admin@byteforge.se (admin role - management access)
 *   - support@byteforge.se (support role - read-heavy)
 *   - viewer@byteforge.se (viewer role - read-only)
 *
 * TENANT USERS (for each tenant-one, tenant-two, tenant-three):
 *   - owner@tenant-X.byteforge.se (full tenant permissions)
 *   - editor@tenant-X.byteforge.se (edit permissions)
 *   - viewer@tenant-X.byteforge.se (view-only)
 *
 * Usage:
 *   php artisan migrate:fresh --seed
 *   php artisan db:seed --class=TestFixturesSeeder
 */
class TestFixturesSeeder extends Seeder
{
    private const PASSWORD = 'password';

    public function run(): void
    {
        activity()->disableLogging();

        $this->call(PassportTestSeeder::class);
        $this->call(RolePermissionSeeder::class);

        $this->createTenantRoles();
        $this->createTenants();
        $this->createCentralUsers();
        $this->createTenantUsers();

        activity()->enableLogging();

        $this->printSummary();
    }

    /**
     * Create tenant-specific roles
     */
    private function createTenantRoles(): void
    {
        $this->command->info("\n🔑 Creating tenant roles...");

        $tenantRoles = [
            'tenant_owner' => [
                'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
                'themes.view', 'themes.manage', 'themes.activate',
                'layouts.view', 'layouts.manage',
                'templates.view', 'templates.manage',
                'media.view', 'media.manage',
            ],
            'tenant_editor' => [
                'pages.create', 'pages.edit', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view', 'media.manage',
            ],
            'tenant_viewer' => [
                'pages.view',
                'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view',
            ],
        ];

        foreach ($tenantRoles as $roleName => $permissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
            $perms = \Spatie\Permission\Models\Permission::whereIn('name', $permissions)
                ->where('guard_name', 'api')
                ->get();
            $role->syncPermissions($perms);
            $this->command->info("  ✓ {$roleName}");
        }
    }

    private function createTenants(): void
    {
        $this->command->info("\n📦 Creating tenants...");

        $tenants = [
            ['id' => 'tenant_one', 'slug' => 'tenant-one', 'name' => 'Tenant One'],
            ['id' => 'tenant_two', 'slug' => 'tenant-two', 'name' => 'Tenant Two'],
            ['id' => 'tenant_three', 'slug' => 'tenant-three', 'name' => 'Tenant Three'],
        ];

        foreach ($tenants as $t) {
            $tenant = Tenant::firstOrCreate(
                ['id' => $t['id']],
                [
                    'name' => $t['name'],
                    'slug' => $t['slug'],
                    'email' => "contact@{$t['slug']}.byteforge.se",
                    'phone' => '+46701234567',
                    'status' => 'active',
                ]
            );

            Domain::firstOrCreate(
                ['domain' => "{$t['slug']}.byteforge.se"],
                ['tenant_id' => $tenant->id]
            );

            $this->command->info("  ✓ {$t['name']} ({$t['slug']}.byteforge.se)");
        }
    }

    private function createCentralUsers(): void
    {
        $this->command->info("\n👤 Creating central users...");

        $users = [
            ['email' => 'superadmin@byteforge.se', 'name' => 'Super Admin', 'role' => 'superadmin'],
            ['email' => 'admin@byteforge.se', 'name' => 'Central Admin', 'role' => 'admin'],
            ['email' => 'support@byteforge.se', 'name' => 'Support Staff', 'role' => 'support'],
            ['email' => 'viewer@byteforge.se', 'name' => 'Central Viewer', 'role' => 'viewer'],
        ];

        foreach ($users as $u) {
            $user = User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make(self::PASSWORD),
                    'type' => 'superadmin',
                    'email_verified_at' => now(),
                ]
            );

            $role = Role::where('name', $u['role'])->where('guard_name', 'api')->first();
            if ($role) {
                $user->syncRoles([$role]);
            }

            $this->command->info("  ✓ {$u['email']} ({$u['role']})");
        }
    }

    private function createTenantUsers(): void
    {
        $this->command->info("\n👥 Creating tenant users...");

        setPermissionsTeamId(null); // Clear team context

        $tenantSlugs = ['tenant-one', 'tenant-two', 'tenant-three'];

        $userTypes = [
            'owner' => [
                'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
                'themes.view', 'themes.manage', 'themes.activate',
                'layouts.view', 'layouts.manage',
                'templates.view', 'templates.manage',
                'media.view', 'media.manage',
            ],
            'editor' => [
                'pages.create', 'pages.edit', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view', 'media.manage',
            ],
            'viewer' => [
                'pages.view',
                'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view',
            ],
        ];

        foreach ($tenantSlugs as $slug) {
            $this->command->info("  {$slug}:");

            foreach ($userTypes as $type => $permissions) {
                $email = "{$type}@{$slug}.byteforge.se";
                $name = ucfirst($type) . ' - ' . ucwords(str_replace('-', ' ', $slug));

                $user = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name' => $name,
                        'password' => Hash::make(self::PASSWORD),
                        'type' => 'tenant_user',
                        'email_verified_at' => now(),
                    ]
                );

                $user->syncPermissions($permissions);
                $this->command->info("    ✓ {$email}");
            }
        }
    }

    private function printSummary(): void
    {
        $this->command->info("\n" . str_repeat('═', 60));
        $this->command->info("✅ TEST FIXTURES READY");
        $this->command->info(str_repeat('═', 60));
        $this->command->info("\n🔑 All passwords: 'password'");
        $this->command->info("\n📋 Central Users:");
        $this->command->info("   superadmin@byteforge.se  → Full access");
        $this->command->info("   admin@byteforge.se       → Admin role");
        $this->command->info("   support@byteforge.se     → Support role");
        $this->command->info("   viewer@byteforge.se      → View only");
        $this->command->info("\n📋 Tenant Users (×3 tenants):");
        $this->command->info("   owner@tenant-X.byteforge.se   → Full permissions");
        $this->command->info("   editor@tenant-X.byteforge.se  → Edit permissions");
        $this->command->info("   viewer@tenant-X.byteforge.se  → View only");
        $this->command->info("\n📋 Tenants:");
        $this->command->info("   tenant-one.byteforge.se");
        $this->command->info("   tenant-two.byteforge.se");
        $this->command->info("   tenant-three.byteforge.se\n");
    }
}
