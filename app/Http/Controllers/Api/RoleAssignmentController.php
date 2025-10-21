<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleAssignmentController extends Controller
{
    // Assign permissions to a role
    public function assignPermissions(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);
        $role->syncPermissions($data['permissions']);
        $role->load('permissions');
        return response()->json($role);
    }

    // Assign roles to a user
    public function assignRoles(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'string|exists:roles,name',
        ]);
        $user->syncRoles($data['roles']);
        $user->load('roles');
        return response()->json($user);
    }
}
