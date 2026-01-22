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

        $oldPermissions = $role->permissions->pluck('name')->toArray();
        $role->syncPermissions($data['permissions']);
        $role->load('permissions');

        activity()
            ->causedBy($request->user())
            ->withProperties([
                'role_name' => $role->name,
                'old_permissions' => $oldPermissions,
                'new_permissions' => $data['permissions'],
            ])
            ->log("Updated permissions for role '{$role->name}'");

        return response()->json($role);
    }

    // Assign roles to a user
    public function assignRoles(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $oldRoles = $user->roles->pluck('name')->toArray();
        $user->syncRoles($data['roles']);
        $user->load('roles');

        activity()
            ->performedOn($user)
            ->causedBy($request->user())
            ->withProperties([
                'old_roles' => $oldRoles,
                'new_roles' => $data['roles'],
            ])
            ->log("Updated roles for user '{$user->email}'");

        return response()->json($user);
    }
}
