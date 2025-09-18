<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Define permissions
        $permissions = [
            'manage pages',
            'view analytics',
            'manage users',
            'manage tenants',
            'access billing',
            'view content',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Define roles and assign permissions
        $roles = [
            'superadmin' => $permissions,
            'owner' => ['manage pages', 'view analytics', 'manage users', 'manage tenants', 'access billing'],
            'staff' => ['manage pages', 'view analytics', 'view content'],
            'customer' => ['view content'],
        ];

        foreach ($roles as $role => $perms) {
            $roleObj = Role::firstOrCreate(['name' => $role]);
            $roleObj->syncPermissions($perms);
        }
    }
}
