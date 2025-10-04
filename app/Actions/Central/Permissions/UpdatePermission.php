<?php

namespace App\Actions\Central\Permissions;

use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\Permission\Models\Permission;

class UpdatePermission
{
    use AsAction;

    public function handle(Permission $permission, array $data): Permission
    {
        // Update permission name if provided
        if (isset($data['name'])) {
            $permission->update(['name' => $data['name']]);
        }

        return $permission->fresh();
    }
}
