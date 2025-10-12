<?php

namespace App\Actions\Api\Superadmin;

use App\Models\User;
use Lorisleiva\Actions\Concerns\AsAction;

class ListUsersAction
{
    use AsAction;

    public function handle(array $filters = []): array
    {
        return $this->execute($filters);
    }

    public function execute(array $filters = []): array
    {
        $query = User::with('roles', 'permissions');

        // Search
        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $filters['per_page'] ?? 15;
        $users = $query->paginate($perPage);

        // Transform data
        $data = collect($users->items())->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->toArray(),
                'permissions' => $user->permissions->pluck('name')->toArray(),
                'created_at' => $user->created_at->toISOString(),
                'updated_at' => $user->updated_at->toISOString(),
            ];
        })->toArray();

        return [
            'data' => $data,
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ];
    }
}
