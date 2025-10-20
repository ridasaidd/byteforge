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
use App\Models\TenantActivity;
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

    // Central Activity Log
    public function indexActivity(Request $request)
    {
        $query = TenantActivity::query()
            ->where('log_name', 'central')
            ->with(['subject', 'causer'])
            ->orderBy('created_at', 'desc');

        // Optional filters
        if ($request->filled('subject_type')) {
            $subjectType = $request->input('subject_type');
            // Map friendly names to classes where possible
            $typeMap = [
                'Page' => \App\Models\Page::class,
                'Navigation' => \App\Models\Navigation::class,
                'User' => \App\Models\User::class,
                'Tenant' => \App\Models\Tenant::class,
            ];
            if (isset($typeMap[$subjectType])) {
                $query->where('subject_type', $typeMap[$subjectType]);
            } else {
                // fallback: allow direct class name filter
                $query->where('subject_type', $subjectType);
            }
        }

        if ($request->filled('event')) {
            $query->where('event', $request->input('event'));
        }

        if ($request->filled('causer_id')) {
            $query->where('causer_id', $request->input('causer_id'));
        }

        $perPage = (int) $request->input('per_page', 15);
        $activities = $query->paginate($perPage);

        return response()->json([
            'data' => $activities->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'log_name' => $activity->log_name,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'subject_type' => class_basename($activity->subject_type),
                    'subject_id' => $activity->subject_id,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'properties' => $activity->properties,
                    'created_at' => $activity->created_at,
                ];
            }),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
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
