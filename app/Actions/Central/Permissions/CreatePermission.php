<?php

namespace App\Actions\Central\Permissions;

use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\Permission\Models\Permission;

class CreatePermission
{
    use AsAction;

    public function handle(array $data): Permission
    {
        $guard = $data['guard'] ?? 'api';

        // Create permission for specified guard
        $permission = Permission::create([
            'name' => $data['name'],
            'guard_name' => $guard,
        ]);

        return $permission;
    }
}
