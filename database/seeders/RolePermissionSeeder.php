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

        // Define granular permissions across central and tenant contexts
        $permissions = [
            // Pages
            'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
            // Navigation
            'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
            // Themes & presentation
            'themes.view', 'themes.manage', 'themes.activate',
            'layouts.view', 'layouts.manage',
            'templates.view', 'templates.manage',
            // Media
            'media.view', 'media.manage',
            // Users & tenants
            'view users', 'manage users',
            'view tenants', 'manage tenants',
            // Roles & permissions
            'manage roles',
            // Activity Logs
            'view activity logs',
            // Settings
            'view settings', 'manage settings',
            // Analytics & dashboard
            'view analytics', 'view dashboard stats',
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
                'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
                'themes.view', 'themes.manage', 'themes.activate',
                'layouts.view', 'layouts.manage',
                'templates.view', 'templates.manage',
                'media.view', 'media.manage',
                'manage users', 'view users',
                'manage tenants', 'view tenants',
                'manage roles',
                'view analytics', 'view dashboard stats',
                'view activity logs',
                'view settings', 'manage settings',
            ],
            'support' => [
                'pages.view', 'navigation.view', 'themes.view', 'layouts.view', 'templates.view', 'media.view',
                'view users', 'view tenants',
                'view analytics', 'view dashboard stats',
                'view activity logs',
            ],
            'viewer' => [
                'pages.view', 'navigation.view', 'themes.view', 'layouts.view', 'templates.view', 'media.view',
                'view users', 'view tenants',
                'view analytics', 'view dashboard stats',
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
