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
    /**
     * Reserved role names that cannot be modified through the API.
     * Prevents privilege escalation by protecting the superadmin role.
     */
    private const PROTECTED_ROLES = ['superadmin'];

    // Assign permissions to a role
    public function assignPermissions(Request $request, Role $role): JsonResponse
    {
        // Prevent modification of protected system roles
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            return response()->json([
                'message' => 'The "' . $role->name . '" role cannot be modified.',
            ], 403);
        }

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

        // Prevent assigning protected system roles to prevent privilege escalation
        $requestedProtected = array_intersect($data['roles'], self::PROTECTED_ROLES);
        if (!empty($requestedProtected)) {
            return response()->json([
                'message' => 'Cannot assign protected system role(s): ' . implode(', ', $requestedProtected),
            ], 403);
        }

        // Prevent modifying roles of users who currently hold a protected role
        $currentProtected = array_intersect($user->roles->pluck('name')->toArray(), self::PROTECTED_ROLES);
        if (!empty($currentProtected)) {
            return response()->json([
                'message' => 'Cannot modify roles of a user with protected role(s): ' . implode(', ', $currentProtected),
            ], 403);
        }

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
