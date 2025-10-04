<?php

namespace App\Http\Controllers\Api\Central;

use App\Actions\Central\Tenants\CreateTenant;
use App\Actions\Central\Tenants\UpdateTenant;
use App\Actions\Central\Tenants\DeleteTenant;
use App\Actions\Central\Tenants\AddUserToTenant;
use App\Actions\Central\Tenants\RemoveUserFromTenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Central\CreateTenantRequest;
use App\Http\Requests\Central\UpdateTenantRequest;
use App\Http\Requests\Central\AddUserToTenantRequest;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class TenantController extends Controller
{
    /**
     * List all tenants with their memberships count
     */
    public function index(): JsonResponse
    {
        $tenants = Tenant::withCount('memberships')
            ->with('domains', 'memberships.user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($tenant) {
                $data = $tenant->data ?? [];
                return [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'domain' => $tenant->domains->first()?->domain,
                    'email' => $data['email'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'status' => $data['status'] ?? 'active',
                    'memberships_count' => $tenant->memberships_count,
                    'created_at' => $tenant->created_at,
                    'updated_at' => $tenant->updated_at,
                ];
            });

        return response()->json([
            'data' => $tenants,
        ]);
    }

    /**
     * Get a specific tenant with members
     */
    public function show(Tenant $tenant): JsonResponse
    {
        $tenant->load([
            'domains',
            'memberships.user:id,name,email,type',
            'memberships' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        $data = $tenant->data ?? [];
        $tenantData = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domains->first()?->domain,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? 'active',
            'memberships' => $tenant->memberships,
            'created_at' => $tenant->created_at,
            'updated_at' => $tenant->updated_at,
        ];

        return response()->json([
            'data' => $tenantData,
        ]);
    }

    /**
     * Create a new tenant
     */
    public function store(CreateTenantRequest $request): JsonResponse
    {
        $tenant = CreateTenant::run($request->validated());

        $data = $tenant->data ?? [];
        $tenantData = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domains->first()?->domain,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_at' => $tenant->created_at,
            'updated_at' => $tenant->updated_at,
        ];

        return response()->json([
            'message' => 'Tenant created successfully',
            'data' => $tenantData,
        ], 201);
    }

    /**
     * Update an existing tenant
     */
    public function update(UpdateTenantRequest $request, Tenant $tenant): JsonResponse
    {
        $tenant = UpdateTenant::run($tenant, $request->validated());

        $data = $tenant->data ?? [];
        $tenantData = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domains->first()?->domain,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_at' => $tenant->created_at,
            'updated_at' => $tenant->updated_at,
        ];

        return response()->json([
            'message' => 'Tenant updated successfully',
            'data' => $tenantData,
        ]);
    }

    /**
     * Delete a tenant
     */
    public function destroy(Tenant $tenant): JsonResponse
    {
        DeleteTenant::run($tenant);

        return response()->json([
            'message' => 'Tenant deleted successfully',
        ]);
    }

    /**
     * Add a user to a tenant (create membership)
     */
    public function addUser(AddUserToTenantRequest $request, Tenant $tenant): JsonResponse
    {
        $user = User::findOrFail($request->user_id);

        $membership = AddUserToTenant::run($tenant, $user, $request->validated());

        return response()->json([
            'message' => 'User added to tenant successfully',
            'data' => $membership->load('user'),
        ], 201);
    }

    /**
     * Remove a user from a tenant (delete membership)
     */
    public function removeUser(Tenant $tenant, User $user): JsonResponse
    {
        $removed = RemoveUserFromTenant::run($tenant, $user);

        if (!$removed) {
            return response()->json([
                'message' => 'User is not a member of this tenant',
            ], 404);
        }

        return response()->json([
            'message' => 'User removed from tenant successfully',
        ]);
    }
}
