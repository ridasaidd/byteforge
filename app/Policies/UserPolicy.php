<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine if the user can view any users.
     */
    public function viewAny(User $user): bool
    {
        return $user->type === 'superadmin' && $user->can('manage users');
    }

    /**
     * Determine if the user can view another user.
     */
    public function view(User $user, User $model): bool
    {
        return $user->type === 'superadmin' && $user->can('manage users');
    }

    /**
     * Determine if the user can create users.
     */
    public function create(User $user): bool
    {
        return $user->type === 'superadmin' && $user->can('manage users');
    }

    /**
     * Determine if the user can update another user.
     */
    public function update(User $user, User $model): bool
    {
        return $user->type === 'superadmin' && $user->can('manage users');
    }

    /**
     * Determine if the user can delete another user.
     */
    public function delete(User $user, User $model): bool
    {
        // Prevent deleting yourself
        if ($user->id === $model->id) {
            return false;
        }

        return $user->type === 'superadmin' && $user->can('manage users');
    }
}
