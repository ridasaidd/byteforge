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
                'workshops.view', 'workshops.create', 'workshops.edit', 'workshops.delete', 'workshops.manage',
                'reviews.view', 'reviews.create', 'reviews.manage',
                'bookings.view', 'bookings.create', 'bookings.manage',
            ],
            'support' => [
                'pages.create', 'pages.edit', 'pages.view',
                'navigation.create', 'navigation.edit', 'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view', 'media.manage',
                'view analytics',
                'workshops.view',
                'reviews.view', 'reviews.manage',
                'bookings.view',
            ],
            'viewer' => [
                'pages.view',
                'navigation.view',
                'themes.view',
                'layouts.view',
                'templates.view',
                'media.view',
                'workshops.view',
                'reviews.view',
                'bookings.view',
            ],
            // Workshop owner: can manage their own workshop listing and view their bookings
            'workshop_owner' => [
                'workshops.view', 'workshops.create', 'workshops.edit',
                'reviews.view',
                'bookings.view', 'bookings.manage',
            ],
            // Customer: can browse workshops, leave reviews, and create bookings
            'customer' => [
                'workshops.view',
                'reviews.view', 'reviews.create',
                'bookings.view', 'bookings.create',
            ],
        ];
    }

    public function membershipRoleToTenantRole(?string $membershipRole): string
    {
        return match ($membershipRole) {
            'owner', 'admin' => 'admin',
            'editor', 'support' => 'support',
            'workshop_owner' => 'workshop_owner',
            'customer' => 'customer',
            default => 'viewer',
        };
    }

    public function tenantRoleToMembershipRole(string $tenantRole): string
    {
        return match ($tenantRole) {
            'admin' => 'owner',
            'support' => 'editor',
            'workshop_owner' => 'workshop_owner',
            'customer' => 'customer',
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

        $user->syncPermissions([]);
        $user->syncRoles([$tenantRole]);

        return $tenantRole;
    }

    public function ensureUserRoleSynced(User $user, string $tenantId, ?string $membershipRole, string $guardName = 'api'): string
    {
        $tenantRole = $this->membershipRoleToTenantRole($membershipRole);

        $this->ensureTenantRoles($tenantId, $guardName);
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        $needsRoleSync = ! $user->hasRole($tenantRole, $guardName)
            || $user->roles()->where('guard_name', $guardName)->count() > 1;

        if ($needsRoleSync) {
            $user->syncRoles([$tenantRole]);
        }

        if ($user->getDirectPermissions()->isNotEmpty()) {
            $user->syncPermissions([]);
        }

        return $tenantRole;
    }
}
