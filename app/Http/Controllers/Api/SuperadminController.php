<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\Superadmin\CreateTenantAction;
use App\Actions\Api\Superadmin\CreateUserAction;
use App\Actions\Api\Superadmin\DeleteTenantAction;
use App\Actions\Api\Superadmin\DeleteUserAction;
use App\Actions\Api\Superadmin\ListTenantsAction;
use App\Actions\Api\Superadmin\ListUsersAction;
use App\Actions\Api\Superadmin\UpdateTenantAction;
use App\Actions\Api\Superadmin\UpdateUserAction;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;

class SuperadminController extends Controller
{
    // Tenant management
    public function indexTenants(Request $request)
    {
        $result = ListTenantsAction::run([
            'search' => $request->input('search'),
            'per_page' => $request->input('per_page', 15),
        ]);

        return response()->json($result);
    }

    public function storeTenant(Request $request)
    {
        $tenant = CreateTenantAction::run($request->all());

        return response()->json(['data' => $tenant], 201);
    }

    public function showTenant(Tenant $tenant)
    {
        $tenant->load('domains');

        $data = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domains->first()->domain ?? null,
            'created_at' => $tenant->created_at->toISOString(),
            'updated_at' => $tenant->updated_at->toISOString(),
        ];

        return response()->json(['data' => $data]);
    }

    public function updateTenant(Request $request, Tenant $tenant)
    {
        $updated = UpdateTenantAction::run($tenant, $request->all());

        return response()->json(['data' => $updated]);
    }

    public function destroyTenant(Tenant $tenant)
    {
        DeleteTenantAction::run($tenant);

        return response()->json(['message' => 'Tenant deleted successfully']);
    }

    // User management
    public function indexUsers(Request $request)
    {
        $result = ListUsersAction::run([
            'search' => $request->input('search'),
            'per_page' => $request->input('per_page', 15),
        ]);

        return response()->json($result);
    }

    public function storeUser(Request $request)
    {
        $user = CreateUserAction::run($request->all());

        return response()->json(['data' => $user], 201);
    }

    public function showUser(User $user)
    {
        $user->load('roles', 'permissions');

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->toArray(),
            'permissions' => $user->permissions->pluck('name')->toArray(),
            'created_at' => $user->created_at->toISOString(),
            'updated_at' => $user->updated_at->toISOString(),
        ];

        return response()->json(['data' => $data]);
    }

    public function updateUser(Request $request, User $user)
    {
        $updated = UpdateUserAction::run($user, $request->all());

        return response()->json(['data' => $updated]);
    }

    public function destroyUser(User $user)
    {
        DeleteUserAction::run($user);

        return response()->json(['message' => 'User deleted successfully']);
    }

    // Add user to tenant
    public function addUserToTenant(Request $request, Tenant $tenant)
    {
        return response()->json(['message' => 'Route superadmin.tenants.addUser works']);
    }

    // Remove user from tenant
    public function removeUserFromTenant(Tenant $tenant, User $user)
    {
        return response()->json(['message' => 'Route superadmin.tenants.removeUser works']);
    }
}
