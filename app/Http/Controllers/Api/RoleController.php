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

    // Create a new role
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|unique:roles,name',
            'guard_name' => 'sometimes|string',
        ]);
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
        $data = $request->validate([
            'name' => 'sometimes|string|unique:roles,name,' . $role->id,
            'guard_name' => 'sometimes|string',
        ]);
        $role->update($data);
        return response()->json($role);
    }

    // Delete a role
    public function destroy(Role $role): JsonResponse
    {
        $role->delete();
        return response()->json(['message' => 'Role deleted']);
    }
}
