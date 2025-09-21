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

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
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

        foreach ($roles as $role => $perms) {
            $roleObj = Role::firstOrCreate(['name' => $role]);
            $roleObj->syncPermissions($perms);
        }
    }
}
