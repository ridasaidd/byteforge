<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Services\TenantRbacService;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function __construct(
        private readonly TenantRbacService $tenantRbac,
    ) {}

    private function tenantMembershipRoleFor(User $user, string $tenantId): ?string
    {
        return $user->memberships->firstWhere('tenant_id', $tenantId)?->role;
    }

    private function tenantUiRoleFor(?string $membershipRole): string
    {
        return $this->tenantRbac->membershipRoleToTenantRole($membershipRole);
    }

    /**
     * List active members of the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $this->tenantRbac->ensureTenantRoles($tenantId);

        $query = User::whereHas('memberships', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)->where('status', 'active');
        })->with([
            'memberships' => fn ($q) => $q->where('tenant_id', $tenantId),
            'roles' => fn ($q) => $q->where('guard_name', 'api'),
        ]);

        if ($request->filled('search')) {
            $search = str_replace(['%', '_'], ['\%', '\_'], $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $users   = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => collect($users->items())->map(fn ($u) => $this->formatUser($u, $tenantId))->values(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    /**
     * Show a single tenant member.
     */
    public function show(User $user): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $isMember = $user->memberships()
            ->where('tenant_id', $tenantId)->where('status', 'active')
            ->exists();

        if (! $isMember) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $this->tenantRbac->ensureTenantRoles($tenantId);
        $user->load([
            'memberships' => fn ($q) => $q->where('tenant_id', $tenantId),
            'roles' => fn ($q) => $q->where('guard_name', 'api'),
        ]);

        return response()->json(['data' => $this->formatUser($user, $tenantId)]);
    }

    /**
     * Create a new tenant staff user and membership.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;
        $actor = $request->user('api');

        $actor->loadMissing(['memberships' => fn ($q) => $q->where('tenant_id', $tenantId)]);
        $actorTenantRole = $this->tenantMembershipRoleFor($actor, $tenantId);

        if ($actorTenantRole !== 'owner') {
            abort(403, 'Only tenant owners can create users.');
        }

        $this->tenantRbac->ensureTenantRoles($tenantId);
        $allowedRoleNames = Role::query()
            ->where('guard_name', 'api')
            ->where('team_id', $tenantId)
            ->pluck('name')
            ->all();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in($allowedRoleNames)],
        ]);

        $membershipRole = $this->tenantRbac->tenantRoleToMembershipRole($validated['role']);

        $user = DB::transaction(function () use ($validated, $tenantId, $membershipRole) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            Membership::create([
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'role' => $membershipRole,
                'status' => 'active',
            ]);

            $this->tenantRbac->syncUserRoleFromMembership($user, $tenantId, $membershipRole);

            return $user;
        });

        $user->load([
            'memberships' => fn ($q) => $q->where('tenant_id', $tenantId),
            'roles' => fn ($q) => $q->where('guard_name', 'api'),
        ]);

        return response()->json(['data' => $this->formatUser($user, $tenantId)], 201);
    }

    /**
     * Assign a Spatie role to a tenant member.
     * Body: { role: string }
     */
    public function assignRole(Request $request, User $user): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $actor = $request->user('api');

        $isMember = $user->memberships()
            ->where('tenant_id', $tenantId)->where('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'User is not a member of this tenant.');
        }

        $actor->loadMissing(['memberships' => fn ($q) => $q->where('tenant_id', $tenantId)]);
        $actorTenantRole = $this->tenantMembershipRoleFor($actor, $tenantId);

        if ($actorTenantRole !== 'owner') {
            abort(403, 'Only tenant owners can change user roles.');
        }

        if ((int) $actor->id === (int) $user->id) {
            return response()->json(['message' => 'You cannot change your own role.'], 422);
        }

        $this->tenantRbac->ensureTenantRoles($tenantId);
        $allowedRoleNames = Role::query()
            ->where('guard_name', 'api')
            ->where('team_id', $tenantId)
            ->pluck('name')
            ->all();

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in($allowedRoleNames)],
        ]);

        $membershipRole = $this->tenantRbac->tenantRoleToMembershipRole($validated['role']);

        $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->update(['role' => $membershipRole]);

        $this->tenantRbac->syncUserRoleFromMembership($user, $tenantId, $membershipRole);
        $user->load([
            'memberships' => fn ($q) => $q->where('tenant_id', $tenantId),
            'roles' => fn ($q) => $q->where('guard_name', 'api'),
        ]);

        return response()->json(['data' => $this->formatUser($user, $tenantId)]);
    }

    /**
     * Remove a Spatie role from a tenant member.
     */
    public function removeRole(User $user, Role $role): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;
        $actor = request()->user('api');

        $isMember = $user->memberships()
            ->where('tenant_id', $tenantId)->where('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'User is not a member of this tenant.');
        }

        $actor->loadMissing(['memberships' => fn ($q) => $q->where('tenant_id', $tenantId)]);
        $actorTenantRole = $this->tenantMembershipRoleFor($actor, $tenantId);

        if ($actorTenantRole !== 'owner') {
            abort(403, 'Only tenant owners can change user roles.');
        }

        if ((int) $actor->id === (int) $user->id) {
            return response()->json(['message' => 'You cannot change your own role.'], 422);
        }

        $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->update(['role' => 'viewer']);

        $this->tenantRbac->syncUserRoleFromMembership($user, $tenantId, 'viewer');

        return response()->json(['message' => 'Role removed.']);
    }

    /**
     * Return roles assignable through the tenant CMS (excludes superadmin).
     */
    public function roles(): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;
        $this->tenantRbac->ensureTenantRoles($tenantId);
        $allowedPermissionNames = collect($this->tenantRbac->permissionNamesForTenant($tenantId));

        $roles = Role::query()
            ->where('guard_name', 'api')
            ->where('team_id', $tenantId)
            ->with(['permissions' => fn ($q) => $q->where('guard_name', 'api')->orderBy('name')])
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name', 'team_id']);

        $roles->each(function (Role $role) use ($allowedPermissionNames): void {
            $role->setRelation(
                'permissions',
                $role->permissions->filter(fn ($perm) => $allowedPermissionNames->contains($perm->name))->values()
            );
        });

        return response()->json(['data' => $roles]);
    }

    /**
     * Return tenant-assignable permissions for role editing.
     */
    public function permissions(): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;
        $allowedPermissionNames = $this->tenantRbac->permissionNamesForTenant($tenantId);

        $permissions = Permission::query()
            ->where('guard_name', 'api')
            ->whereIn('name', $allowedPermissionNames)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $permissions]);
    }

    /**
     * Create tenant-scoped custom role.
     */
    public function storeRole(Request $request): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;
        $actor = $request->user('api');

        $actor->loadMissing(['memberships' => fn ($q) => $q->where('tenant_id', $tenantId)]);
        $actorTenantRole = $this->tenantMembershipRoleFor($actor, $tenantId);

        if ($actorTenantRole !== 'owner') {
            abort(403, 'Only tenant owners can manage roles.');
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:80',
                Rule::unique('roles', 'name')->where(fn ($q) => $q
                    ->where('guard_name', 'api')
                    ->where('team_id', $tenantId)
                ),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        if (in_array($validated['name'], TenantRbacService::TENANT_ROLE_NAMES, true)) {
            return response()->json([
                'message' => 'Fixed tenant roles cannot be created manually.',
            ], 422);
        }

        $allowedPermissionNames = collect($this->tenantRbac->permissionNamesForTenant($tenantId));
        $permissionNames = collect($validated['permissions'] ?? [])->unique()->values();

        if ($permissionNames->diff($allowedPermissionNames)->isNotEmpty()) {
            return response()->json(['message' => 'One or more permissions are not assignable in tenant context.'], 422);
        }

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'api',
            'team_id' => $tenantId,
        ]);

        $permissions = Permission::query()
            ->where('guard_name', 'api')
            ->whereIn('name', $permissionNames->all())
            ->get();

        $role->syncPermissions($permissions);
        $role->load('permissions');

        return response()->json(['data' => $role], 201);
    }

    /**
     * Update tenant-scoped custom role.
     */
    public function updateRole(Request $request, Role $role): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;
        $actor = $request->user('api');

        $actor->loadMissing(['memberships' => fn ($q) => $q->where('tenant_id', $tenantId)]);
        $actorTenantRole = $this->tenantMembershipRoleFor($actor, $tenantId);

        if ($actorTenantRole !== 'owner') {
            abort(403, 'Only tenant owners can manage roles.');
        }

        if ((string) $role->team_id !== $tenantId || $role->guard_name !== 'api') {
            abort(404);
        }

        if (in_array($role->name, TenantRbacService::TENANT_ROLE_NAMES, true)) {
            return response()->json(['message' => 'Fixed tenant roles cannot be modified.'], 422);
        }

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:80',
                Rule::unique('roles', 'name')->ignore($role->id)->where(fn ($q) => $q
                    ->where('guard_name', 'api')
                    ->where('team_id', $tenantId)
                ),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        if (isset($validated['name']) && in_array($validated['name'], TenantRbacService::TENANT_ROLE_NAMES, true)) {
            return response()->json(['message' => 'Fixed tenant role names are reserved.'], 422);
        }

        $allowedPermissionNames = collect($this->tenantRbac->permissionNamesForTenant($tenantId));
        $permissionNames = collect($validated['permissions'] ?? null);

        if ($permissionNames->isNotEmpty() && $permissionNames->diff($allowedPermissionNames)->isNotEmpty()) {
            return response()->json(['message' => 'One or more permissions are not assignable in tenant context.'], 422);
        }

        if (isset($validated['name'])) {
            $role->name = $validated['name'];
            $role->save();
        }

        if (array_key_exists('permissions', $validated)) {
            $permissions = Permission::query()
                ->where('guard_name', 'api')
                ->whereIn('name', $permissionNames->all())
                ->get();

            $role->syncPermissions($permissions);
        }

        $role->load('permissions');

        return response()->json(['data' => $role]);
    }

    /**
     * Delete tenant-scoped custom role when no users are assigned.
     */
    public function destroyRole(Request $request, Role $role): JsonResponse
    {
        $tenantId = (string) tenancy()->tenant->id;
        $actor = $request->user('api');

        $actor->loadMissing(['memberships' => fn ($q) => $q->where('tenant_id', $tenantId)]);
        $actorTenantRole = $this->tenantMembershipRoleFor($actor, $tenantId);

        if ($actorTenantRole !== 'owner') {
            abort(403, 'Only tenant owners can manage roles.');
        }

        if ((string) $role->team_id !== $tenantId || $role->guard_name !== 'api') {
            abort(404);
        }

        if (in_array($role->name, TenantRbacService::TENANT_ROLE_NAMES, true)) {
            return response()->json(['message' => 'Fixed tenant roles cannot be deleted.'], 422);
        }

        $assignedUsers = DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->where('model_type', User::class)
            ->where('team_id', $tenantId)
            ->exists();

        if ($assignedUsers) {
            return response()->json(['message' => 'Cannot delete a role that is assigned to users.'], 403);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted']);
    }

    private function formatUser(User $user, string $tenantId): array
    {
        $membershipRole = $this->tenantMembershipRoleFor($user, $tenantId);
        $uiRole = $this->tenantUiRoleFor($membershipRole);

        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'avatar'     => $user->avatar ?? null,
            'roles'      => [['name' => $uiRole, 'membership_role' => $membershipRole]],
            'created_at' => $user->created_at->toISOString(),
            'updated_at' => $user->updated_at->toISOString(),
        ];
    }
}
