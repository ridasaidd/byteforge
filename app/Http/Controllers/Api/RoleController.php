<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    // List all roles
    public function index(Request $request): JsonResponse
    {
        $guard = $request->query('guard', 'api');
        $roles = Role::with('permissions')->where('guard_name', $guard)->get();
        return response()->json($roles);
    }

    /**
     * Reserved role names that cannot be created or deleted through the API.
     */
    private const PROTECTED_ROLES = ['superadmin'];

    // Create a new role
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|unique:roles,name',
            'guard_name' => 'sometimes|string',
        ]);

        if (in_array(strtolower($data['name']), array_map('strtolower', self::PROTECTED_ROLES), true)) {
            return response()->json([
                'message' => 'Cannot create a role with a reserved name.',
            ], 403);
        }

        $role = Role::create($data);
        return response()->json($role, 201);
    }

    // Show a single role
    public function show(Role $role): JsonResponse
    {
        $role->load('permissions');
        return response()->json($role);
    }

    // Update a role
    public function update(Request $request, Role $role): JsonResponse
    {
        // Prevent modifying protected system roles
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            return response()->json([
                'message' => 'Cannot modify a protected system role.',
            ], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|unique:roles,name,' . $role->id,
            'guard_name' => 'sometimes|string',
        ]);

        // Prevent renaming a role TO a protected name
        if (isset($data['name']) && in_array(strtolower($data['name']), array_map('strtolower', self::PROTECTED_ROLES), true)) {
            return response()->json([
                'message' => 'Cannot rename a role to a reserved name.',
            ], 403);
        }

        $role->update($data);
        return response()->json($role);
    }

    // Delete a role
    public function destroy(Role $role): JsonResponse
    {
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            return response()->json([
                'message' => 'Cannot delete a protected system role.',
            ], 403);
        }

        $role->delete();
        return response()->json(['message' => 'Role deleted']);
    }
}
