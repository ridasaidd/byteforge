<?php

namespace App\Actions\Central\Users;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\User;

class DeleteUser
{
    use AsAction;

    public function handle(User $user): bool
    {
        // Remove all roles
        $user->roles()->detach();

        // Delete all memberships
        $user->memberships()->delete();

        // Delete the user
        return $user->delete();
    }
}
