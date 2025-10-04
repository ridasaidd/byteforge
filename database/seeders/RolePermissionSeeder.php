<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
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
            'superadmin' => $permissions,
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
        foreach ($roles as $role => $perms) {
            // Web guard roles
            $roleObjWeb = Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
            $roleObjWeb->syncPermissions($perms);

            // API guard roles
            $roleObjApi = Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
            $roleObjApi->syncPermissions($perms);
        }
    }
}
