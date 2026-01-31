<?php

namespace Tests\Support;

use App\Models\Tenant;
use App\Models\User;

/**
 * Test user helper for accessing seeded test users.
 *
 * SEEDED USERS (from TestFixturesSeeder):
 *
 * Central Users (all passwords: 'password'):
 *   - superadmin@byteforge.se (superadmin role)
 *   - admin@byteforge.se (admin role)
 *   - support@byteforge.se (support role)
 *   - viewer@byteforge.se (viewer role)
 *
 * Tenant Users (for each tenant-one, tenant-two, tenant-three):
 *   - owner@tenant-X.byteforge.se (full permissions)
 *   - editor@tenant-X.byteforge.se (edit permissions)
 *   - viewer@tenant-X.byteforge.se (view only)
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
        return User::where('email', 'superadmin@byteforge.se')->firstOrFail();
    }

    public static function centralAdmin(): User
    {
        return User::where('email', 'admin@byteforge.se')->firstOrFail();
    }

    public static function centralSupport(): User
    {
        return User::where('email', 'support@byteforge.se')->firstOrFail();
    }

    public static function centralViewer(): User
    {
        return User::where('email', 'viewer@byteforge.se')->firstOrFail();
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
        return User::where('email', "owner@{$tenantSlug}.byteforge.se")->firstOrFail();
    }

    /**
     * Get the editor user for a tenant.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     */
    public static function tenantEditor(string $tenantSlug = 'tenant-one'): User
    {
        return User::where('email', "editor@{$tenantSlug}.byteforge.se")->firstOrFail();
    }

    /**
     * Get the viewer user for a tenant.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     */
    public static function tenantViewer(string $tenantSlug = 'tenant-one'): User
    {
        return User::where('email', "viewer@{$tenantSlug}.byteforge.se")->firstOrFail();
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

    // =========================================================================
    // TENANTS
    // =========================================================================

    public static function tenant(string $slug = 'tenant-one'): Tenant
    {
        return Tenant::where('slug', $slug)->firstOrFail();
    }
}
