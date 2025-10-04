<?php

namespace App\Actions\Api\Auth;

class LogoutAction
{
    public function execute($user): void
    {
        $user->token()->revoke();
    }
}
