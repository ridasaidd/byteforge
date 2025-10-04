<?php

namespace App\Http\Controllers\Api\Central;

use App\Actions\Central\Permissions\CreatePermission;
use App\Actions\Central\Permissions\DeletePermission;
use App\Actions\Central\Permissions\UpdatePermission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Central\CreatePermissionRequest;
use App\Http\Requests\Central\UpdatePermissionRequest;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /**
     * List all permissions with their roles
     */
    public function index(): JsonResponse
    {
        $permissions = Permission::with('roles')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $permissions,
        ]);
    }

    /**
     * Get a specific permission with its roles
     */
    public function show(Permission $permission): JsonResponse
    {
        return response()->json([
            'data' => $permission->load('roles'),
        ]);
    }

    /**
     * Create a new permission
     */
    public function store(CreatePermissionRequest $request): JsonResponse
    {
        $permission = CreatePermission::run($request->validated());

        return response()->json([
            'message' => 'Permission created successfully',
            'data' => $permission,
        ], 201);
    }

    /**
     * Update an existing permission
     */
    public function update(UpdatePermissionRequest $request, Permission $permission): JsonResponse
    {
        $permission = UpdatePermission::run($permission, $request->validated());

        return response()->json([
            'message' => 'Permission updated successfully',
            'data' => $permission,
        ]);
    }

    /**
     * Delete a permission
     */
    public function destroy(Permission $permission): JsonResponse
    {
        DeletePermission::run($permission);

        return response()->json([
            'message' => 'Permission deleted successfully',
        ]);
    }
}
