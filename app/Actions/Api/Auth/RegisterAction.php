<?php

namespace App\Actions\Api\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RegisterAction
{
    public function execute(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'type' => $data['type'] ?? 'customer',
        ]);

        $token = $user->createToken('api-token')->accessToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
