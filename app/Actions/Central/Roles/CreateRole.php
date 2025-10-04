<?php

namespace App\Actions\Central\Roles;

use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\Permission\Models\Role;

class CreateRole
{
    use AsAction;

    public function handle(array $data): Role
    {
        $guard = $data['guard'] ?? 'api';

        // Create role for specified guard
        $role = Role::create([
            'name' => $data['name'],
            'guard_name' => $guard,
        ]);

        // If permissions provided, assign them
        if (!empty($data['permissions'])) {
            $role->givePermissionTo($data['permissions']);
        }

        return $role->load('permissions');
    }
}
