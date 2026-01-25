<?php

namespace Tests;

use Database\Seeders\TestFixturesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed all test fixtures (permissions, roles, central users, tenants)
        $this->seed(TestFixturesSeeder::class);
    }

    /**
     * Get a central app user by role.
     *
     * Usage in tests:
     *   $superadmin = $this->getCentralUser('superadmin');
     *   $admin = $this->getCentralUser('admin');
     */
    protected function getCentralUser(string $role): ?\App\Models\User
    {
        return \App\Models\User::whereHas('roles', function ($query) use ($role) {
            $query->where('name', $role)->where('guard_name', 'api');
        })->first();
    }

    /**
     * Get a tenant user by tenant slug.
     *
     * Usage in tests:
     *   $userOne = $this->getTenantUser('tenant-one');
     */
    protected function getTenantUser(string $tenantSlug): ?\App\Models\User
    {
        return \App\Models\User::where('email', "user.{$tenantSlug}@byteforge.se")->first();
    }

    /**
     * Get a tenant by slug.
     *
     * Usage in tests:
     *   $tenantOne = $this->getTenant('tenant-one');
     */
    protected function getTenant(string $slug): ?\App\Models\Tenant
    {
        return \App\Models\Tenant::where('slug', $slug)->first();
    }
}


