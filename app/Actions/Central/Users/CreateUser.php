<?php

namespace App\Actions\Central\Users;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CreateUser
{
    use AsAction;

    public function handle(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'type' => $data['type'] ?? 'tenant_user',
        ]);

        // Assign roles if provided
        if (!empty($data['roles'])) {
            $user->assignRole($data['roles']);
        }

        return $user->fresh()->load('roles');
    }
}
