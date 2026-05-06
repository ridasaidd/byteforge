<?php

namespace Tests\Support;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;

/**
 * Test user helper for accessing seeded test users.
 *
 * SEEDED USERS (from TestFixturesSeeder):
 *
 * Central Users (all passwords: 'password'):
 *   - superadmin@<central-domain> (superadmin role)
 *   - admin@<central-domain> (admin role)
 *   - support@<central-domain> (support role)
 *   - viewer@<central-domain> (viewer role)
 *
 * Tenant Users (for each tenant-one, tenant-two, tenant-three):
 *   - owner@<tenant-domain> (full permissions)
 *   - editor@<tenant-domain> (edit permissions)
 *   - viewer@<tenant-domain> (view only)
 *
 * Fixed tenant-linked users:
 *   - user.multiple@byteforge.test (tenant_one + tenant_two)
 *   - user.single@byteforge.test (tenant_three)
 *
 * Usage:
 *   $superadmin = TestUsers::centralSuperadmin();
 *   $admin = TestUsers::centralAdmin();
 *   $tenantOwner = TestUsers::tenantOwner('tenant-one');
 */
class TestUsers
{
    // =========================================================================
    // CENTRAL USERS
    // =========================================================================

    public static function centralSuperadmin(): User
    {
        return User::where('email', 'superadmin@' . self::centralDomain())->firstOrFail();
    }

    public static function centralAdmin(): User
    {
        return User::where('email', 'admin@' . self::centralDomain())->firstOrFail();
    }

    public static function centralSupport(): User
    {
        return User::where('email', 'support@' . self::centralDomain())->firstOrFail();
    }

    public static function centralViewer(): User
    {
        return User::where('email', 'viewer@' . self::centralDomain())->firstOrFail();
    }

    public static function centralByRole(string $role): User
    {
        return match ($role) {
            'superadmin' => self::centralSuperadmin(),
            'admin' => self::centralAdmin(),
            'support' => self::centralSupport(),
            'viewer' => self::centralViewer(),
            default => throw new \InvalidArgumentException("Unknown role: {$role}"),
        };
    }

    // =========================================================================
    // TENANT USERS
    // =========================================================================

    /**
     * Get the owner user for a tenant.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     */
    public static function tenantOwner(string $tenantSlug = 'tenant-one'): User
    {
        return User::where('email', sprintf('owner@%s', self::tenantDomain($tenantSlug)))->firstOrFail();
    }

    /**
     * Get the editor user for a tenant.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     */
    public static function tenantEditor(string $tenantSlug = 'tenant-one'): User
    {
        return User::where('email', sprintf('editor@%s', self::tenantDomain($tenantSlug)))->firstOrFail();
    }

    /**
     * Get the viewer user for a tenant.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     */
    public static function tenantViewer(string $tenantSlug = 'tenant-one'): User
    {
        return User::where('email', sprintf('viewer@%s', self::tenantDomain($tenantSlug)))->firstOrFail();
    }

    /**
     * Get a tenant user by role.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     * @param string $role One of: owner, editor, viewer
     */
    public static function tenantByRole(string $tenantSlug, string $role): User
    {
        return match ($role) {
            'owner' => self::tenantOwner($tenantSlug),
            'editor' => self::tenantEditor($tenantSlug),
            'viewer' => self::tenantViewer($tenantSlug),
            default => throw new \InvalidArgumentException("Unknown role: {$role}"),
        };
    }

    public static function tenantBySlug(string $tenantSlug): User
    {
        return self::tenantOwner($tenantSlug);
    }

    // =========================================================================
    // TENANTS
    // =========================================================================

    public static function tenant(string $slug = 'tenant-one'): Tenant
    {
        return Tenant::where('slug', $slug)->firstOrFail();
    }

    public static function createUserWithNoPermissions(): User
    {
        return User::factory()->create([
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
    }

    /**
     * @param array<string> $permissions
     */
    public static function createUserWithPermissions(array $permissions): User
    {
        $user = self::createUserWithNoPermissions();

        $permissionModels = Permission::query()
            ->where('guard_name', 'api')
            ->whereIn('name', $permissions)
            ->get();

        if ($permissionModels->isNotEmpty()) {
            $user->givePermissionTo($permissionModels);
        }

        return $user;
    }

    private static function tenantDomain(string $tenantSlug): string
    {
        $template = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.byteforge.se');
        $resolved = str_replace(':tenant', $tenantSlug, $template);
        $normalized = strtolower($resolved);

        if ($normalized === '' || str_contains($normalized, 'localhost') || str_contains($normalized, '127.0.0.1')) {
            return sprintf('%s.%s', $tenantSlug, self::centralDomain());
        }

        return $resolved;
    }

    private static function centralDomain(): string
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
