<?php

namespace App\Actions\Api\Superadmin;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateUserAction
{
    use AsAction;

    public function handle(array $data): array
    {
        return $this->execute($data);
    }

    public function execute(array $data): array
    {
        $validated = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|exists:roles,name',
        ])->validate();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Assign the selected role (uses 'api' guard from User model)
        $user->assignRole($validated['role']);

        // Log activity in central log
        $causer = auth('api')->user();
        activity('central')
            ->performedOn($user)
            ->causedBy($causer)
            ->event('created')
            ->withProperties([
                'attributes' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $validated['role'],
                ],
            ])
            ->log('User created');

        // Load relationships
        $user->load('roles', 'permissions');

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
