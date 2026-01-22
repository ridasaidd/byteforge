<?php

namespace Tests\Traits;

use App\Models\User;
use Spatie\Permission\Models\Role;

trait AssignsPermissions
{
    /**
     * Give a user full permissions for testing.
     */
    protected function giveUserAllPermissions(User $user): User
    {
        $superadminRole = Role::where('name', 'superadmin')
            ->where('guard_name', 'api')
            ->first();

        if ($superadminRole) {
            $user->syncRoles([$superadminRole]);
        }

        return $user;
    }

    /**
     * Give a user admin permissions for testing.
     */
    protected function giveUserAdminPermissions(User $user): User
    {
        $adminRole = Role::where('name', 'admin')
            ->where('guard_name', 'api')
            ->first();

        if ($adminRole) {
            $user->syncRoles([$adminRole]);
        }

        return $user;
    }

    /**
     * Give a user specific permissions for testing.
     */
    protected function giveUserPermissions(User $user, array $permissions): User
    {
        $user->syncPermissions($permissions);
        return $user;
    }
}
