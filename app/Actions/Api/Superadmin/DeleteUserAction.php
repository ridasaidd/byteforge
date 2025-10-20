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
        $causer = auth('api')->user();
        activity('central')
            ->performedOn($user)
            ->causedBy($causer)
            ->event('deleted')
            ->withProperties([
                'attributes' => [
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ])
            ->log('User deleted');

        $user->delete();
    }
}
