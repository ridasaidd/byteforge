<?php

namespace App\Http\Controllers\Api\Central;

use App\Actions\Central\Roles\CreateRole;
use App\Actions\Central\Roles\DeleteRole;
use App\Actions\Central\Roles\UpdateRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Central\CreateRoleRequest;
use App\Http\Requests\Central\UpdateRoleRequest;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * List all roles with their permissions
     */
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $roles,
        ]);
    }

    /**
     * Get a specific role with its permissions
     */
    public function show(Role $role): JsonResponse
    {
        return response()->json([
            'data' => $role->load('permissions'),
        ]);
    }

    /**
     * Create a new role
     */
    public function store(CreateRoleRequest $request): JsonResponse
    {
        $role = CreateRole::run($request->validated());

        return response()->json([
            'message' => 'Role created successfully',
            'data' => $role,
        ], 201);
    }

    /**
     * Update an existing role
     */
    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $role = UpdateRole::run($role, $request->validated());

        return response()->json([
            'message' => 'Role updated successfully',
            'data' => $role,
        ]);
    }

    /**
     * Delete a role
     */
    public function destroy(Role $role): JsonResponse
    {
        DeleteRole::run($role);

        return response()->json([
            'message' => 'Role deleted successfully',
        ]);
    }
}
