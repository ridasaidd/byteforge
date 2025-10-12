<?php

namespace App\Actions\Api\Superadmin;

use App\Models\User;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteUserAction
{
    use AsAction;

    public function handle(User $user): void
    {
        $this->execute($user);
    }

    public function execute(User $user): void
    {
        $user->delete();
    }
}
