<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TenantRbacService
{
    private const TENANT_ROLE_NAMES = ['admin', 'support', 'viewer'];

    /**
     * @return array<string, array<int, string>>
     */
    public function roleDefinitions(): array
    {
        return [
            'admin' => [
                'pages.create', 'pages.edit', 'pages.delete', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.delete', 'navigation.view',
                'themes.view', 'themes.manage', 'themes.activate',
                'layouts.view', 'layouts.manage',
                'templates.view', 'templates.manage',
                'media.view', 'media.manage',
                'view users', 'manage users', 'manage roles',
                'view settings', 'manage settings',
                'view analytics',
                'payments.view', 'payments.manage', 'payments.refund',
            ],
            'support' => [
                'pages.create', 'pages.edit', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view', 'media.manage',
                'view analytics',
            ],
            'viewer' => [
                'pages.view',
                'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view',
            ],
        ];
    }

    public function membershipRoleToTenantRole(?string $membershipRole): string
    {
        return match ($membershipRole) {
            'owner', 'admin' => 'admin',
            'editor', 'support' => 'support',
            default => 'viewer',
        };
    }

    public function tenantRoleToMembershipRole(string $tenantRole): string
    {
        return match ($tenantRole) {
            'admin' => 'owner',
            'support' => 'editor',
            default => 'viewer',
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
        $user->syncRoles([$role]);
        $this->removeGlobalTenantRoleNames($user, $guardName);

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

        $hasGlobalTenantRoleName = $user->roles()
            ->where('roles.guard_name', $guardName)
            ->whereNull('roles.team_id')
            ->whereIn('roles.name', self::TENANT_ROLE_NAMES)
            ->exists();

        $needsRoleSync = ! $hasScopedRole || $hasUnexpectedTenantRole || $hasGlobalTenantRoleName;

        if ($needsRoleSync) {
            $user->syncRoles([$role]);
            $this->removeGlobalTenantRoleNames($user, $guardName);
        }

        if ($user->getDirectPermissions()->isNotEmpty()) {
            $user->syncPermissions([]);
        }

        return $tenantRole;
    }

    private function findTenantScopedRole(string $roleName, string $tenantId, string $guardName): Role
    {
        return Role::query()
            ->where('guard_name', $guardName)
            ->where('name', $roleName)
            ->where('team_id', $tenantId)
            ->firstOrFail();
    }

    private function removeGlobalTenantRoleNames(User $user, string $guardName): void
    {
        $globalRoleIds = Role::query()
            ->where('guard_name', $guardName)
            ->whereNull('team_id')
            ->whereIn('name', self::TENANT_ROLE_NAMES)
            ->pluck('id');

        if ($globalRoleIds->isEmpty()) {
            return;
        }

        DB::table('model_has_roles')
            ->where('model_type', $user->getMorphClass())
            ->where('model_id', $user->getKey())
            ->whereIn('role_id', $globalRoleIds->all())
            ->delete();
    }
}
