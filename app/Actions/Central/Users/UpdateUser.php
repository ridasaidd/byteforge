<?php

namespace App\Actions\Central\Users;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UpdateUser
{
    use AsAction;

    public function handle(User $user, array $data): User
    {
        $updateData = [
            'name' => $data['name'] ?? $user->name,
            'email' => $data['email'] ?? $user->email,
            'type' => $data['type'] ?? $user->type,
        ];

        // Only update password if provided
        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $user->update($updateData);

        // Sync roles if provided
        if (isset($data['roles'])) {
            $user->syncRoles($data['roles']);
        }

        return $user->fresh()->load('roles');
    }
}
