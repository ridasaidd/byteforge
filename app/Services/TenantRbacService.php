<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\TenantAddon;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TenantRbacService
{
    private const TENANT_PERMISSION_CACHE_PREFIX = 'spatie.permission.cache.tenant.';

    public const TENANT_ROLE_NAMES = ['admin', 'support', 'viewer', 'platform_support'];

    /**
     * @var array<string, array<int, string>>
     */
    private const BASE_ROLE_DEFINITIONS = [
        'admin' => [
            'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
            'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
            'themes.view', 'themes.manage', 'themes.activate',
            'layouts.view', 'layouts.manage',
            'templates.view', 'templates.manage',
            'media.view', 'media.manage',
            'users.view', 'users.manage', 'roles.manage',
            'settings.view', 'settings.manage',
            'analytics.view',
        ],
        'support' => [
            'pages.create', 'pages.edit', 'pages.view',
            'navigation.create', 'navigation.edit', 'navigation.view',
            'themes.view',
            'layouts.view',
            'templates.view',
            'media.view', 'media.manage',
            'analytics.view',
        ],
        'viewer' => [
            'pages.view',
            'navigation.view',
            'themes.view',
            'layouts.view',
            'templates.view',
            'media.view',
        ],
        'platform_support' => [
            'pages.view',
            'navigation.view',
            'themes.view',
            'layouts.view',
            'templates.view',
            'media.view',
            'analytics.view',
        ],
    ];

    /**
     * @var array<string, array<string, array<int, string>>>
     */
    private const ADDON_ROLE_DEFINITIONS = [
        'booking' => [
            'admin' => ['bookings.view', 'bookings.manage', 'bookings.cancel'],
            'support' => ['bookings.view'],
            'viewer' => ['bookings.view'],
            'platform_support' => ['bookings.view'],
        ],
        'payments' => [
            'admin' => ['payments.view', 'payments.manage', 'payments.refund'],
        ],
    ];

    /**
     * @return array<string, array<int, string>>
     */
    public function roleDefinitions(?string $tenantId = null): array
    {
        $definitions = self::BASE_ROLE_DEFINITIONS;

        // Fixed roles always include the full platform-defined tenant permission set.
        // Add-on-aware filtering is applied only when exposing assignable permissions in UI/API.
        $activeFeatureFlags = array_keys(self::ADDON_ROLE_DEFINITIONS);

        foreach ($activeFeatureFlags as $featureFlag) {
            $addonDefinitions = self::ADDON_ROLE_DEFINITIONS[$featureFlag] ?? null;
            if ($addonDefinitions === null) {
                continue;
            }

            foreach ($addonDefinitions as $roleName => $permissionNames) {
                $current = $definitions[$roleName] ?? [];
                $definitions[$roleName] = array_values(array_unique(array_merge($current, $permissionNames)));
            }
        }

        return $definitions;
    }

    /**
     * @return array<int, string>
     */
    public function permissionNamesForTenant(string $tenantId): array
    {
        $definitions = self::BASE_ROLE_DEFINITIONS;

        foreach ($this->activeAddonFeatureFlags($tenantId) as $featureFlag) {
            $addonDefinitions = self::ADDON_ROLE_DEFINITIONS[$featureFlag] ?? null;
            if ($addonDefinitions === null) {
                continue;
            }

            foreach ($addonDefinitions as $roleName => $permissionNames) {
                $current = $definitions[$roleName] ?? [];
                $definitions[$roleName] = array_values(array_unique(array_merge($current, $permissionNames)));
            }
        }

        return collect($definitions)
            ->flatten()
            ->unique()
            ->values()
            ->all();
    }

    public function membershipRoleToTenantRole(?string $membershipRole): string
    {
        return match ($membershipRole) {
            'owner', 'admin' => 'admin',
            'editor', 'support' => 'support',
            'support_access' => 'platform_support',
            'viewer' => 'viewer',
            null, '' => 'viewer',
            default => $membershipRole,
        };
    }

    public function tenantRoleToMembershipRole(string $tenantRole): string
    {
        return match ($tenantRole) {
            'admin' => 'owner',
            'support' => 'editor',
            'platform_support' => 'support_access',
            'viewer' => 'viewer',
            default => $tenantRole,
        };
    }

    /**
     * @return array<int, Role>
     */
    public function ensureTenantRoles(string $tenantId, string $guardName = 'api'): array
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        $roles = [];
        foreach ($this->roleDefinitions() as $roleName => $permissionNames) {
            $role = Role::firstOrCreate([
                'team_id' => $tenantId,
                'name' => $roleName,
                'guard_name' => $guardName,
            ]);

            $permissions = Permission::query()
                ->where('guard_name', $guardName)
                ->whereIn('name', $permissionNames)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->sort()
                ->values()
                ->all();

            $currentPermissionIds = DB::table('role_has_permissions')
                ->where('role_id', $role->id)
                ->pluck('permission_id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values()
                ->all();

            // Avoid syncPermissions() write-amplification on every request.
            // insertOrIgnore + scoped delete converges state safely under concurrency.
            if ($currentPermissionIds !== $permissions) {
                if (! empty($permissions)) {
                    DB::table('role_has_permissions')->insertOrIgnore(
                        array_map(
                            fn (int $permissionId): array => [
                                'permission_id' => $permissionId,
                                'role_id' => (int) $role->id,
                            ],
                            $permissions
                        )
                    );
                }

                $removeQuery = DB::table('role_has_permissions')
                    ->where('role_id', $role->id);

                if (! empty($permissions)) {
                    $removeQuery->whereNotIn('permission_id', $permissions);
                }

                $removeQuery->delete();
            }

            $roles[] = $role;
        }

        return $roles;
    }

    public function syncUserRoleFromMembership(User $user, string $tenantId, ?string $membershipRole, string $guardName = 'api'): string
    {
        $tenantRole = $this->membershipRoleToTenantRole($membershipRole);

        $this->ensureTenantRoles($tenantId, $guardName);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        $role = $this->findTenantScopedRole($tenantRole, $tenantId, $guardName);

        $user->syncPermissions([]);
        $this->syncTenantScopedRoleAssignment($user, $role);

        return $tenantRole;
    }

    public function ensureUserRoleSynced(User $user, string $tenantId, ?string $membershipRole, string $guardName = 'api'): string
    {
        $tenantRole = $this->membershipRoleToTenantRole($membershipRole);

        $this->ensureTenantRoles($tenantId, $guardName);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        $role = $this->findTenantScopedRole($tenantRole, $tenantId, $guardName);

        $hasScopedRole = $user->roles()
            ->where('roles.id', $role->id)
            ->where('roles.guard_name', $guardName)
            ->exists();

        $hasUnexpectedTenantRole = $user->roles()
            ->where('roles.guard_name', $guardName)
            ->where('roles.team_id', $tenantId)
            ->whereIn('roles.name', self::TENANT_ROLE_NAMES)
            ->where('roles.id', '!=', $role->id)
            ->exists();

        $needsRoleSync = ! $hasScopedRole || $hasUnexpectedTenantRole;

        if ($needsRoleSync) {
            $this->syncTenantScopedRoleAssignment($user, $role);
        }

        if ($user->getDirectPermissions()->isNotEmpty()) {
            $user->syncPermissions([]);
        }

        return $tenantRole;
    }

    public function refreshTenantPermissionCache(string $tenantId): void
    {
        $permissionRegistrar = app(PermissionRegistrar::class);
        $originalCacheKey = $permissionRegistrar->cacheKey;

        try {
            $permissionRegistrar->cacheKey = self::TENANT_PERMISSION_CACHE_PREFIX.$tenantId;
            $permissionRegistrar->forgetCachedPermissions();
        } finally {
            $permissionRegistrar->cacheKey = $originalCacheKey;
        }
    }

    private function findTenantScopedRole(string $roleName, string $tenantId, string $guardName): Role
    {
        return Role::query()
            ->where('guard_name', $guardName)
            ->where('name', $roleName)
            ->where('team_id', $tenantId)
            ->firstOrFail();
    }

    private function syncTenantScopedRoleAssignment(User $user, Role $role): void
    {
        $tenantRoleIds = Role::query()
            ->where('guard_name', $role->guard_name)
            ->where('team_id', $role->team_id)
            ->whereIn('name', self::TENANT_ROLE_NAMES)
            ->pluck('id');

        DB::table('model_has_roles')
            ->where('model_type', $user->getMorphClass())
            ->where('model_id', $user->getKey())
            ->where('team_id', $role->team_id)
            ->whereIn('role_id', $tenantRoleIds->all())
            ->where('role_id', '!=', $role->id)
            ->delete();

        DB::table('model_has_roles')->insertOrIgnore([
            'role_id' => (int) $role->id,
            'model_type' => $user->getMorphClass(),
            'model_id' => $user->getKey(),
            'team_id' => $role->team_id,
        ]);

        $user->unsetRelation('roles');
        $user->unsetRelation('permissions');
    }

    /**
     * @return array<int, string>
     */
    private function activeAddonFeatureFlags(string $tenantId): array
    {
        return TenantAddon::query()
            ->forTenant($tenantId)
            ->active()
            ->whereHas('addon', fn ($q) => $q->whereIn('feature_flag', array_keys(self::ADDON_ROLE_DEFINITIONS)))
            ->with('addon:id,feature_flag')
            ->get()
            ->map(fn (TenantAddon $tenantAddon) => (string) optional($tenantAddon->addon)->feature_flag)
            ->filter(fn (string $flag) => $flag !== '')
            ->unique()
            ->values()
            ->all();
    }
}
