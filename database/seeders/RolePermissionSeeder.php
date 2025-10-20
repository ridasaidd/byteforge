<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define granular permissions for pages and navigation
        $permissions = [
            // Pages
            'pages.create',
            'pages.edit',
            'pages.delete',
            'pages.view',
            // Navigation
            'navigation.create',
            'navigation.edit',
            'navigation.delete',
            'navigation.view',
            // Other
            'view analytics',
            'manage users',
            'manage tenants',
            'access billing',
            'view content',
        ];

        // Create permissions for both web and api guards
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        // Define roles and assign granular permissions
        $roles = [
            // Central Admin Roles (for managing the platform)
            'superadmin' => $permissions, // Full access to everything
            'admin' => ['manage users', 'manage tenants', 'view analytics', 'view content'], // Full central admin access
            'support' => ['view content', 'view analytics'], // Read-only access to help tenants
            'viewer' => ['view content'], // Read-only observer
            
            // Tenant Roles (for tenant users)
            'owner' => [
                'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
                'view analytics', 'manage users', 'manage tenants', 'access billing', 'view content'
            ],
            'staff' => [
                'pages.create', 'pages.edit', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.view',
                'view analytics', 'view content'
            ],
            'customer' => [
                'pages.view', 'navigation.view', 'view content'
            ],
        ];

        // Create roles for both web and api guards
        foreach ($roles as $roleName => $perms) {
            // Web guard
            $webRole = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $webPermissions = Permission::whereIn('name', $perms)->where('guard_name', 'web')->get();
            $webRole->syncPermissions($webPermissions);
            
            // API guard
            $apiRole = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
            $apiPermissions = Permission::whereIn('name', $perms)->where('guard_name', 'api')->get();
            $apiRole->syncPermissions($apiPermissions);
        }
    }
}
