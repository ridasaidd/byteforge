<?php

namespace Database\Seeders;

use App\Models\Addon;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Membership;
use App\Services\TenantRbacService;
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
        $this->seedBillingDefaults();
        $this->createTenants();
        $this->createCentralUsers();
        $this->createFixedMultiTenantUsers();
        $this->createTenantUsers();
        $this->createTenantMemberships();

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
                'analytics.view',
                'payments.view', 'payments.manage', 'payments.refund',
            ],
            'tenant_editor' => [
                'pages.create', 'pages.edit', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view', 'media.manage',
                'analytics.view',
                'payments.view',
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

    /**
     * Seed base plans and add-ons used by Phase 10 billing.
     */
    private function seedBillingDefaults(): void
    {
        $this->command->info("\n💳 Seeding billing defaults...");

        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price_monthly' => 0,
                'price_yearly' => 0,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 5, 'max_media_mb' => 500, 'max_users' => 2, 'custom_domain' => false],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'stripe_price_id' => config('cashier.prices.starter') ?: null,
                'price_monthly' => 14900,
                'price_yearly' => 149000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 25, 'max_media_mb' => 5000, 'max_users' => 5, 'custom_domain' => true],
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'stripe_price_id' => config('cashier.prices.business') ?: null,
                'price_monthly' => 39900,
                'price_yearly' => 399000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 999999, 'max_media_mb' => 50000, 'max_users' => 999999, 'custom_domain' => true],
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        $addons = [
            [
                'name' => 'Booking System',
                'slug' => 'booking',
                'description' => 'Appointment scheduling, calendar, and booking management',
                'stripe_price_id' => 'price_booking_placeholder',
                'price_monthly' => 9900,
                'currency' => 'SEK',
                'feature_flag' => 'booking',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Payment Processing',
                'slug' => 'payments',
                'description' => 'Stripe, Swish, and Klarna payment capabilities',
                'stripe_price_id' => 'price_payments_placeholder',
                'price_monthly' => 7900,
                'currency' => 'SEK',
                'feature_flag' => 'payments',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Analytics Pro',
                'slug' => 'analytics-pro',
                'description' => 'Advanced analytics, exports, and custom reports',
                'stripe_price_id' => 'price_analytics_pro_placeholder',
                'price_monthly' => 4900,
                'currency' => 'SEK',
                'feature_flag' => 'analytics_pro',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Priority Support',
                'slug' => 'priority-support',
                'description' => 'Fast-track support handling',
                'stripe_price_id' => 'price_priority_support_placeholder',
                'price_monthly' => 9900,
                'currency' => 'SEK',
                'feature_flag' => 'priority_support',
                'is_active' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($addons as $addon) {
            Addon::updateOrCreate(['slug' => $addon['slug']], $addon);
        }

        $this->command->info('  ✓ plans and add-ons seeded');
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
                    'domain' => $this->tenantDomain($t['slug']),
                    'email' => $this->tenantContactEmail($t['slug']),
                    'phone' => '+46701234567',
                    'status' => 'active',
                ]
            );

            Domain::firstOrCreate(
                ['domain' => $this->tenantDomain($t['slug'])],
                ['tenant_id' => $tenant->id]
            );

            $this->command->info("  ✓ {$t['name']} ({$this->tenantDomain($t['slug'])})");
        }
    }

    private function createCentralUsers(): void
    {
        $this->command->info("\n👤 Creating central users...");

        $users = [
            ['email' => 'superadmin@' . $this->centralDomain(), 'name' => 'Super Admin', 'role' => 'superadmin'],
            ['email' => 'admin@' . $this->centralDomain(), 'name' => 'Central Admin', 'role' => 'admin'],
            ['email' => 'support@' . $this->centralDomain(), 'name' => 'Support Staff', 'role' => 'support'],
            ['email' => 'viewer@' . $this->centralDomain(), 'name' => 'Central Viewer', 'role' => 'viewer'],
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
        $tenantRbac = app(TenantRbacService::class);

        $tenantSlugs = ['tenant-one', 'tenant-two', 'tenant-three'];

        $userTypes = ['owner', 'editor', 'viewer'];

        foreach ($tenantSlugs as $slug) {
            $this->command->info("  {$slug}:");
            $tenantId = str_replace('-', '_', $slug);
            $tenantRbac->ensureTenantRoles($tenantId);

            foreach ($userTypes as $type) {
                $email = "{$type}@{$this->tenantDomain($slug)}";
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

                $tenantRbac->syncUserRoleFromMembership($user, $tenantId, $type);
                $this->command->info("    ✓ {$email}");
            }
        }

        setPermissionsTeamId(null);
    }

    private function createTenantMemberships(): void
    {
        $this->command->info("\n🔗 Creating tenant memberships...");

        $tenantSlugs = ['tenant-one', 'tenant-two', 'tenant-three'];
        $userTypes = ['owner', 'editor', 'viewer'];

        foreach ($tenantSlugs as $slug) {
            $tenantId = str_replace('-', '_', $slug);
            $tenant = Tenant::find($tenantId);

            if (! $tenant) {
                $this->command->warn("  ⚠ Tenant {$tenantId} not found, skipping memberships");
                continue;
            }

            foreach ($userTypes as $type) {
                $email = "{$type}@{$this->tenantDomain($slug)}";
                $user = User::where('email', $email)->first();

                if (! $user) {
                    $this->command->warn("  ⚠ User {$email} not found, skipping membership");
                    continue;
                }

                Membership::firstOrCreate(
                    ['user_id' => $user->id, 'tenant_id' => $tenantId],
                    ['role' => $type, 'status' => 'active']
                );

                $this->command->info("  ✓ {$email} → {$tenantId} ({$type})");
            }
        }
    }

    private function createFixedMultiTenantUsers(): void
    {
        $this->command->info("\n🧩 Creating fixed multi-tenant users...");

        $tenantRbac = app(TenantRbacService::class);

        $userMultiple = User::firstOrCreate(
            ['email' => 'user.multiple@byteforge.test'],
            [
                'name' => 'User With Multiple Tenants',
                'password' => Hash::make(self::PASSWORD),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );

        $userSingle = User::firstOrCreate(
            ['email' => 'user.single@byteforge.test'],
            [
                'name' => 'User With One Tenant',
                'password' => Hash::make(self::PASSWORD),
                'type' => 'tenant_user',
                'email_verified_at' => now(),
            ]
        );

        Membership::firstOrCreate(
            ['user_id' => $userMultiple->id, 'tenant_id' => 'tenant_one'],
            ['role' => 'owner', 'status' => 'active']
        );
        Membership::firstOrCreate(
            ['user_id' => $userMultiple->id, 'tenant_id' => 'tenant_two'],
            ['role' => 'owner', 'status' => 'active']
        );
        Membership::firstOrCreate(
            ['user_id' => $userSingle->id, 'tenant_id' => 'tenant_three'],
            ['role' => 'owner', 'status' => 'active']
        );

        $tenantRbac->ensureTenantRoles('tenant_one');
        $tenantRbac->ensureTenantRoles('tenant_two');
        $tenantRbac->ensureTenantRoles('tenant_three');
        $tenantRbac->syncUserRoleFromMembership($userMultiple, 'tenant_one', 'owner');
        $tenantRbac->syncUserRoleFromMembership($userMultiple, 'tenant_two', 'owner');
        $tenantRbac->syncUserRoleFromMembership($userSingle, 'tenant_three', 'owner');

        $this->command->info('  ✓ user.multiple@byteforge.test linked to tenant_one + tenant_two');
        $this->command->info('  ✓ user.single@byteforge.test linked to tenant_three');
    }

    private function printSummary(): void
    {
        $this->command->info("\n" . str_repeat('═', 60));
        $this->command->info("✅ TEST FIXTURES READY");
        $this->command->info(str_repeat('═', 60));
        $this->command->info("\n🔑 All passwords: 'password'");
        $this->command->info("\n📋 Central Users:");
        $this->command->info("   superadmin@{$this->centralDomain()}  → Full access");
        $this->command->info("   admin@{$this->centralDomain()}       → Admin role");
        $this->command->info("   support@{$this->centralDomain()}     → Support role");
        $this->command->info("   viewer@{$this->centralDomain()}      → View only");
        $this->command->info("\n📋 Tenant Users (×3 tenants):");
        $this->command->info("   owner@tenant-X.<tenant-domain>   → Full permissions");
        $this->command->info("   editor@tenant-X.<tenant-domain>  → Edit permissions");
        $this->command->info("   viewer@tenant-X.<tenant-domain>  → View only");
        $this->command->info("\n📋 Fixed Tenant-Linked Users:");
        $this->command->info("   user.multiple@byteforge.test  → tenant_one + tenant_two");
        $this->command->info("   user.single@byteforge.test    → tenant_three");
        $this->command->info("\n📋 Tenants:");
        $this->command->info("   {$this->tenantDomain('tenant-one')}");
        $this->command->info("   {$this->tenantDomain('tenant-two')}");
        $this->command->info("   {$this->tenantDomain('tenant-three')}\n");
    }

    private function tenantContactEmail(string $tenantSlug): string
    {
        return sprintf('contact@%s', $this->tenantDomain($tenantSlug));
    }

    private function tenantDomain(string $tenantSlug): string
    {
        $template = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.byteforge.se');
        $resolved = str_replace(':tenant', $tenantSlug, $template);
        $normalized = strtolower($resolved);

        if ($normalized === '' || str_contains($normalized, 'localhost') || str_contains($normalized, '127.0.0.1')) {
            return sprintf('%s.%s', $tenantSlug, $this->centralDomain());
        }

        return $resolved;
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
