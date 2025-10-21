<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define granular permissions for pages and navigation
        $permissions = [
            // Pages (for tenants to manage their website content)
            'pages.create',
            'pages.edit',
            'pages.delete',
            'pages.view',
            // Navigation (for tenants to manage their website navigation)
            'navigation.create',
            'navigation.edit',
            'navigation.delete',
            'navigation.view',
            // User Management (central admin)
            'view users',
            'manage users',
            // Tenant Management (central admin)
            'view tenants',
            'manage tenants',
            // Role & Permission Management (central admin)
            'manage roles',
            // Activity Logs (central admin)
            'view activity logs',
            // Settings (central admin)
            'view settings',
            'manage settings',
            // Analytics (central admin and tenants)
            'view analytics',
        ];

        // Create permissions for both web and api guards
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        // Define roles and assign granular permissions
        // NOTE: Only central admin roles are defined here.
        // Tenants should create their own custom roles through the UI as needed.
        $roles = [
            // Central Admin Roles (for managing the platform)
            'superadmin' => $permissions, // Full access to everything
            'admin' => [
                'manage users', 'view users',
                'manage tenants', 'view tenants',
                'manage roles',
                'view analytics',
                'view activity logs',
                'view settings', 'manage settings',
            ], // Full central admin access (can do everything except assign superadmin powers)
            'support' => [
                'view users', 'view tenants',
                'view analytics',
                'view activity logs',
            ], // Read-only access to help tenants and view system stats
            'viewer' => [
                'view users', 'view tenants',
                'view analytics',
            ], // Read-only observer (can see users, tenants, and analytics but not activity logs)
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

        // Ensure superadmin always has all permissions (even if new permissions are added later)
        foreach (['web', 'api'] as $guard) {
            $superadminRole = Role::where('name', 'superadmin')->where('guard_name', $guard)->first();
            if ($superadminRole) {
                $allPerms = Permission::where('guard_name', $guard)->get();
                $superadminRole->syncPermissions($allPerms);
            }
        }
    }
}
