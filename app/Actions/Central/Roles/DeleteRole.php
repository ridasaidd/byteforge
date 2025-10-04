<?php

namespace App\Actions\Central\Roles;

use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\Permission\Models\Role;

class DeleteRole
{
    use AsAction;

    public function handle(Role $role): bool
    {
        // Remove all permissions from role
        $role->revokePermissionTo($role->permissions);

        // Delete the role
        return $role->delete();
    }
}
