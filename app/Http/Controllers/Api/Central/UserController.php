<?php

namespace App\Http\Controllers\Api\Central;

use App\Actions\Central\Users\CreateUser;
use App\Actions\Central\Users\UpdateUser;
use App\Actions\Central\Users\DeleteUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Central\CreateUserRequest;
use App\Http\Requests\Central\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    /**
     * List all users with their roles and memberships
     */
    public function index(): JsonResponse
    {
        $users = User::with([
            'roles:id,name',
            'memberships.tenant:id,name,domain'
        ])
            ->withCount('memberships')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $users,
        ]);
    }

    /**
     * Get a specific user with details
     */
    public function show(User $user): JsonResponse
    {
        $user->load([
            'roles:id,name',
            'memberships.tenant:id,name,domain,status',
            'memberships' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        return response()->json([
            'data' => $user,
        ]);
    }

    /**
     * Create a new user
     */
    public function store(CreateUserRequest $request): JsonResponse
    {
        $user = CreateUser::run($request->validated());

        return response()->json([
            'message' => 'User created successfully',
            'data' => $user,
        ], 201);
    }

    /**
     * Update an existing user
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user = UpdateUser::run($user, $request->validated());

        return response()->json([
            'message' => 'User updated successfully',
            'data' => $user,
        ]);
    }

    /**
     * Delete a user
     */
    public function destroy(User $user): JsonResponse
    {
        DeleteUser::run($user);

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }
}
