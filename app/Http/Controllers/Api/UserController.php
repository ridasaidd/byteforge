<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TenantRbacService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

    private function tenantUiRoleFor(User $user): string
    {
        $role = $user->roles->first();

        if ($role && is_string($role->name) && $role->name !== '') {
            return $role->name;
        }

        return 'viewer';
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

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(array_keys($this->tenantRbac->roleDefinitions()))],
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

        $roles = Role::query()
            ->where('guard_name', 'api')
            ->where('team_id', $tenantId)
            ->with(['permissions' => fn ($q) => $q->where('guard_name', 'api')->orderBy('name')])
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name', 'team_id']);

        return response()->json(['data' => $roles]);
    }

    private function formatUser(User $user, string $tenantId): array
    {
        $membershipRole = $this->tenantMembershipRoleFor($user, $tenantId);
        $uiRole = $this->tenantUiRoleFor($user);

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
