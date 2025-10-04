<?php

namespace App\Actions\Central\Permissions;

use Lorisleiva\Actions\Concerns\AsAction;
use Spatie\Permission\Models\Permission;

class DeletePermission
{
    use AsAction;

    public function handle(Permission $permission): bool
    {
        // Delete the permission
        return $permission->delete();
    }
}
