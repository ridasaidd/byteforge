<?php

namespace App\Actions\Central\Roles;

use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\Permission\Models\Role;

class UpdateRole
{
    use AsAction;

    public function handle(Role $role, array $data): Role
    {
        // Update role name if provided
        if (isset($data['name'])) {
            $role->update(['name' => $data['name']]);
        }

        // Sync permissions if provided
        if (isset($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        return $role->fresh()->load('permissions');
    }
}
