<?php

namespace App\Actions\Api\Auth;

class RefreshAction
{
    public function execute($user): array
    {
        $user->token()->revoke();
        $token = $user->createToken('api-token')->accessToken;

        return [
            'token' => $token,
        ];
    }
}
