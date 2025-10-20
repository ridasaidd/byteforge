<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.users.index works']);
    }

    /**
     * Display the specified user
     */
    public function show(User $user): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.users.show works']);
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, User $user): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.users.assignRole works']);
    }

    /**
     * Remove role from user
     */
    public function removeRole(User $user, Role $role): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.users.removeRole works']);
    }
}
