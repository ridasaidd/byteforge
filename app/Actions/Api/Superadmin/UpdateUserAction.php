<?php

namespace App\Actions\Api\Superadmin;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateUserAction
{
    use AsAction;

    public function handle(User $user, array $data): array
    {
        return $this->execute($user, $data);
    }

    public function execute(User $user, array $data): array
    {
        $validated = Validator::make($data, [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,'.$user->id,
            'password' => 'sometimes|required|string|min:8|confirmed',
            'role' => 'sometimes|required|string|exists:roles,name',
        ])->validate();

        $original = $user->getOriginal();
        $updateData = [];

        if (isset($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }

        if (isset($validated['email'])) {
            $updateData['email'] = $validated['email'];
        }

        if (isset($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        if (! empty($updateData)) {
            $user->update($updateData);
        }

        // Update role if provided
        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        // Load relationships
        $user->refresh()->load('roles', 'permissions');

        // Log activity for update
        $causer = auth('api')->user();
        activity('central')
            ->performedOn($user)
            ->causedBy($causer)
            ->event('updated')
            ->withProperties([
                'attributes' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name')->toArray(),
                ],
                'old' => [
                    'name' => $original['name'] ?? null,
                    'email' => $original['email'] ?? null,
                ],
            ])
            ->log('User updated');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->toArray(),
            'permissions' => $user->permissions->pluck('name')->toArray(),
            'created_at' => $user->created_at->toISOString(),
            'updated_at' => $user->updated_at->toISOString(),
        ];
    }
}
