<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    // List all permissions
    public function index(Request $request): JsonResponse
    {
        $guard = $request->query('guard', 'api');
        $permissions = Permission::where('guard_name', $guard)->get();
        return response()->json($permissions);
    }

    // Create a new permission
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|unique:permissions,name',
            'guard_name' => 'sometimes|string',
        ]);
        $permission = Permission::create($data);
        return response()->json($permission, 201);
    }

    // Show a single permission
    public function show(Permission $permission): JsonResponse
    {
        return response()->json($permission);
    }

    // Update a permission
    public function update(Request $request, Permission $permission): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|unique:permissions,name,' . $permission->id,
            'guard_name' => 'sometimes|string',
        ]);
        $permission->update($data);
        return response()->json($permission);
    }

    // Delete a permission
    public function destroy(Permission $permission): JsonResponse
    {
        $permission->delete();
        return response()->json(['message' => 'Permission deleted']);
    }
}
