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
            'users.view', 'users.manage',
            'tenants.view', 'tenants.manage',
            // Roles & permissions
            'roles.manage',
            // Activity Logs
            'activity.view',
            // Settings
            'settings.view', 'settings.manage',
            // Analytics & dashboard
            'analytics.view', 'analytics.platform', 'analytics.dashboard',
            // Billing (central)
            'billing.view', 'billing.manage',
            // Payments (tenant)
            'payments.view', 'payments.manage', 'payments.refund',
            // Bookings (tenant addon)
            'bookings.view', 'bookings.manage', 'bookings.cancel',
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
                'users.manage', 'users.view',
                'tenants.manage', 'tenants.view',
                'roles.manage',
                'analytics.view', 'analytics.platform', 'analytics.dashboard',
                'activity.view',
                'settings.view', 'settings.manage',
                'billing.view',
                'bookings.view', 'bookings.manage', 'bookings.cancel',
                'payments.view', 'payments.manage', 'payments.refund',
            ],
            'support' => [
                'pages.view', 'navigation.view', 'themes.view', 'layouts.view', 'templates.view', 'media.view',
                'users.view', 'tenants.view',
                'analytics.view', 'analytics.dashboard',
                'activity.view',
            ],
            'viewer' => [
                'pages.view', 'navigation.view', 'themes.view', 'layouts.view', 'templates.view', 'media.view',
                'users.view', 'tenants.view',
                'analytics.view', 'analytics.dashboard',
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
