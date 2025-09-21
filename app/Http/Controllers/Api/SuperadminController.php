<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SuperadminController extends Controller
{
    // Tenant management
    public function indexTenants()
    {
        return response()->json(['message' => 'Route superadmin.tenants.index works']);
    }

    public function storeTenant(Request $request)
    {
        return response()->json(['message' => 'Route superadmin.tenants.store works']);
    }

    public function showTenant(Tenant $tenant)
    {
        return response()->json(['message' => 'Route superadmin.tenants.show works']);
    }

    public function updateTenant(Request $request, Tenant $tenant)
    {
        return response()->json(['message' => 'Route superadmin.tenants.update works']);
    }

    public function destroyTenant(Tenant $tenant)
    {
        return response()->json(['message' => 'Route superadmin.tenants.destroy works']);
    }

    // User management
    public function indexUsers()
    {
        return response()->json(['message' => 'Route superadmin.users.index works']);
    }

    public function storeUser(Request $request)
    {
        return response()->json(['message' => 'Route superadmin.users.store works']);
    }

    public function showUser(User $user)
    {
        return response()->json(['message' => 'Route superadmin.users.show works']);
    }

    public function updateUser(Request $request, User $user)
    {
        return response()->json(['message' => 'Route superadmin.users.update works']);
    }

    public function destroyUser(User $user)
    {
        return response()->json(['message' => 'Route superadmin.users.destroy works']);
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