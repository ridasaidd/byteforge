<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Membership;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Models\TenantSupportAccessGrant;
use App\Models\User;
use App\Models\WebRefreshSession;
use App\Notifications\TenantSupportAccessOwnerNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class TenantSupportAccessService
{
    public const MEMBERSHIP_SOURCE = 'support_access';
    public const MEMBERSHIP_ROLE = 'support_access';
    public const MAX_DURATION_HOURS = 168;

    public function __construct(
        private readonly TenantRbacService $tenantRbac,
        private readonly PermissionRegistrar $permissionRegistrar,
    ) {}

    public function grant(Tenant $tenant, User $supportUser, User $actor, string $reason, int $durationHours): TenantSupportAccessGrant
    {
        $this->assertEligibleSupportUser($supportUser);
        $this->assertValidDuration($durationHours);

        $tenantId = (string) $tenant->id;

        $existingMembership = Membership::query()
            ->where('user_id', $supportUser->id)
            ->where('tenant_id', $tenantId)
            ->first();

        if ($existingMembership && $existingMembership->source !== self::MEMBERSHIP_SOURCE) {
            throw ValidationException::withMessages([
                'support_user_id' => ['User already has a non-support membership for this tenant.'],
            ]);
        }

        $overlappingGrant = TenantSupportAccessGrant::query()
            ->where('tenant_id', $tenantId)
            ->where('support_user_id', $supportUser->id)
            ->effective()
            ->exists();

        if ($overlappingGrant) {
            throw ValidationException::withMessages([
                'support_user_id' => ['An active support grant already exists for this user and tenant.'],
            ]);
        }

        $startsAt = now();
        $expiresAt = $startsAt->copy()->addHours($durationHours);

        return DB::transaction(function () use ($tenant, $tenantId, $supportUser, $actor, $reason, $startsAt, $expiresAt): TenantSupportAccessGrant {
            $membership = Membership::query()->updateOrCreate(
                [
                    'user_id' => $supportUser->id,
                    'tenant_id' => $tenantId,
                ],
                [
                    'role' => self::MEMBERSHIP_ROLE,
                    'status' => 'active',
                    'source' => self::MEMBERSHIP_SOURCE,
                    'expires_at' => $expiresAt,
                ]
            );

            $this->tenantRbac->syncUserRoleFromMembership($supportUser, $tenantId, self::MEMBERSHIP_ROLE);
            $this->tenantRbac->refreshTenantPermissionCache($tenantId);
            $this->permissionRegistrar->setPermissionsTeamId(null);

            $grant = TenantSupportAccessGrant::query()->create([
                'tenant_id' => $tenantId,
                'support_user_id' => $supportUser->id,
                'granted_by_user_id' => $actor->id,
                'membership_id' => $membership->id,
                'reason' => $reason,
                'status' => 'active',
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
            ]);

            $this->logCentralGrant($tenant, $supportUser, $actor, $reason, $expiresAt);
            $this->logTenantGrant($tenantId, $supportUser, $actor, $reason, $expiresAt);

            $grant = $grant->load(['supportUser', 'grantedBy', 'membership', 'tenant.domains']);
            $this->notifyTenantOwner($tenant, $grant, TenantSupportAccessOwnerNotification::EVENT_GRANTED);

            return $grant;
        });
    }

    public function revoke(TenantSupportAccessGrant $grant, User $actor, ?string $reason = null): TenantSupportAccessGrant
    {
        if ($grant->status !== 'active' || $grant->revoked_at !== null) {
            throw ValidationException::withMessages([
                'grant' => ['Only active support grants can be revoked.'],
            ]);
        }

        return DB::transaction(function () use ($grant, $actor, $reason): TenantSupportAccessGrant {
            $now = now();

            $grant->forceFill([
                'status' => 'revoked',
                'revoked_at' => $now,
                'revoked_by_user_id' => $actor->id,
                'revoke_reason' => $reason,
            ])->save();

            if ($grant->membership && $grant->membership->source === self::MEMBERSHIP_SOURCE) {
                $grant->membership->forceFill([
                    'status' => 'revoked',
                    'expires_at' => $now,
                ])->save();
            }

            $this->tenantRbac->refreshTenantPermissionCache($grant->tenant_id);
            $this->revokeRefreshSessions($grant->support_user_id, $grant->tenant_id, $now);
            $this->logCentralRevoke($grant, $actor, $reason);
            $this->logTenantRevoke($grant, $actor, $reason);

            $grant = $grant->fresh(['supportUser', 'grantedBy', 'revokedBy', 'membership', 'tenant.domains']);

            if ($grant->tenant) {
                $this->notifyTenantOwner($grant->tenant, $grant, TenantSupportAccessOwnerNotification::EVENT_REVOKED);
            }

            return $grant;
        });
    }

    public function expireSupportAccessIfNeeded(User $user, string $tenantId): void
    {
        $expiredAt = now();

        $grants = TenantSupportAccessGrant::query()
            ->where('tenant_id', $tenantId)
            ->where('support_user_id', $user->id)
            ->where('status', 'active')
            ->where('expires_at', '<=', now())
            ->whereNull('revoked_at')
            ->with(['membership', 'supportUser', 'grantedBy', 'tenant.domains'])
            ->get();

        foreach ($grants as $grant) {
            $this->expireGrant($grant, $expiredAt);
        }
    }

    public function isSupportAccessMembership(Membership $membership): bool
    {
        return $membership->source === self::MEMBERSHIP_SOURCE;
    }

    public function expireActiveGrants(?Carbon $expiredAt = null): int
    {
        $expiredAt ??= now();

        $grants = TenantSupportAccessGrant::query()
            ->where('status', 'active')
            ->whereNull('revoked_at')
            ->where('expires_at', '<=', $expiredAt)
            ->with(['membership', 'supportUser', 'grantedBy', 'tenant.domains'])
            ->get();

        $expiredCount = 0;

        foreach ($grants as $grant) {
            if ($this->expireGrant($grant, $expiredAt)) {
                $expiredCount++;
            }
        }

        return $expiredCount;
    }

    private function assertEligibleSupportUser(User $supportUser): void
    {
        $hasCentralSupportRole = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', $supportUser->getMorphClass())
            ->where('model_has_roles.model_id', $supportUser->getKey())
            ->whereNull('model_has_roles.team_id')
            ->where('roles.guard_name', 'api')
            ->whereNull('roles.team_id')
            ->where('roles.name', 'support')
            ->exists();

        if (! $hasCentralSupportRole) {
            throw ValidationException::withMessages([
                'support_user_id' => ['Only central support users may receive temporary support access.'],
            ]);
        }
    }

    private function assertValidDuration(int $durationHours): void
    {
        if ($durationHours < 1 || $durationHours > self::MAX_DURATION_HOURS) {
            throw ValidationException::withMessages([
                'duration_hours' => ['Duration must be between 1 and 168 hours.'],
            ]);
        }
    }

    private function revokeRefreshSessions(int $userId, string $tenantId, Carbon $revokedAt): void
    {
        WebRefreshSession::query()
            ->where('user_id', $userId)
            ->where('tenant_id', $tenantId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $revokedAt]);
    }

    private function logCentralGrant(Tenant $tenant, User $supportUser, User $actor, string $reason, Carbon $expiresAt): void
    {
        activity('central')
            ->causedBy($actor)
            ->performedOn($tenant)
            ->event('granted')
            ->withProperties([
                'support_user_id' => $supportUser->id,
                'support_user_email' => $supportUser->email,
                'tenant_id' => (string) $tenant->id,
                'reason' => $reason,
                'expires_at' => $expiresAt->toISOString(),
            ])
            ->log(sprintf(
                '%s granted temporary support access to %s for tenant %s until %s',
                $actor->name,
                $supportUser->email,
                $tenant->slug,
                $expiresAt->utc()->format('Y-m-d H:i:s') . ' UTC'
            ));
    }

    private function logTenantGrant(string $tenantId, User $supportUser, User $actor, string $reason, Carbon $expiresAt): void
    {
        TenantActivity::query()->create([
            'tenant_id' => $tenantId,
            'log_name' => 'tenant',
            'event' => 'granted',
            'description' => sprintf(
                'Central admin %s granted temporary support access to %s until %s',
                $actor->name,
                $supportUser->email,
                $expiresAt->utc()->format('Y-m-d H:i:s') . ' UTC'
            ),
            'subject_type' => User::class,
            'subject_id' => (string) $supportUser->id,
            'causer_type' => User::class,
            'causer_id' => $actor->id,
            'properties' => [
                'reason' => $reason,
                'expires_at' => $expiresAt->toISOString(),
                'support_user_email' => $supportUser->email,
            ],
        ]);
    }

    private function logCentralRevoke(TenantSupportAccessGrant $grant, User $actor, ?string $reason): void
    {
        activity('central')
            ->causedBy($actor)
            ->event('revoked')
            ->withProperties([
                'tenant_id' => $grant->tenant_id,
                'support_user_id' => $grant->support_user_id,
                'revoke_reason' => $reason,
            ])
            ->log(sprintf(
                '%s revoked temporary support access for %s on tenant %s',
                $actor->name,
                $grant->supportUser?->email ?? ('user#' . $grant->support_user_id),
                $grant->tenant_id,
            ));
    }

    private function logCentralExpiry(TenantSupportAccessGrant $grant): void
    {
        $tenant = $grant->tenant;
        $tenantLabel = $tenant?->slug ?? $grant->tenant_id;

        activity('central')
            ->performedOn($tenant)
            ->event('expired')
            ->withProperties([
                'tenant_id' => $grant->tenant_id,
                'support_user_id' => $grant->support_user_id,
                'expires_at' => $grant->expires_at?->toISOString(),
            ])
            ->log(sprintf(
                'Temporary support access for %s on tenant %s expired',
                $grant->supportUser?->email ?? ('user#' . $grant->support_user_id),
                $tenantLabel,
            ));
    }

    private function logTenantRevoke(TenantSupportAccessGrant $grant, User $actor, ?string $reason): void
    {
        TenantActivity::query()->create([
            'tenant_id' => $grant->tenant_id,
            'log_name' => 'tenant',
            'event' => 'revoked',
            'description' => sprintf(
                'Central admin %s revoked temporary support access for %s',
                $actor->name,
                $grant->supportUser?->email ?? ('user#' . $grant->support_user_id),
            ),
            'subject_type' => User::class,
            'subject_id' => (string) $grant->support_user_id,
            'causer_type' => User::class,
            'causer_id' => $actor->id,
            'properties' => [
                'revoke_reason' => $reason,
            ],
        ]);
    }

    private function logTenantExpiry(TenantSupportAccessGrant $grant): void
    {
        TenantActivity::query()->create([
            'tenant_id' => $grant->tenant_id,
            'log_name' => 'tenant',
            'event' => 'expired',
            'description' => sprintf(
                'Temporary support access for %s expired',
                $grant->supportUser?->email ?? ('user#' . $grant->support_user_id),
            ),
            'subject_type' => User::class,
            'subject_id' => (string) $grant->support_user_id,
            'causer_type' => null,
            'causer_id' => null,
            'properties' => [
                'expires_at' => $grant->expires_at?->toISOString(),
            ],
        ]);
    }

    private function expireGrant(TenantSupportAccessGrant $grant, Carbon $expiredAt): bool
    {
        if ($grant->status !== 'active' || $grant->revoked_at !== null) {
            return false;
        }

        DB::transaction(function () use ($grant, $expiredAt): void {
            $grant->forceFill([
                'status' => 'expired',
            ])->save();

            $membership = $grant->membership
                ?? Membership::query()
                    ->where('user_id', $grant->support_user_id)
                    ->where('tenant_id', $grant->tenant_id)
                    ->where('source', self::MEMBERSHIP_SOURCE)
                    ->first();

            if ($membership && $membership->source === self::MEMBERSHIP_SOURCE && $membership->status === 'active') {
                $membership->forceFill([
                    'status' => 'expired',
                    'expires_at' => $expiredAt,
                ])->save();
            }

            $this->tenantRbac->refreshTenantPermissionCache($grant->tenant_id);
            $this->revokeRefreshSessions($grant->support_user_id, $grant->tenant_id, $expiredAt);
            $this->logCentralExpiry($grant);
            $this->logTenantExpiry($grant);
        });

        $grant = $grant->fresh(['supportUser', 'grantedBy', 'membership', 'tenant.domains']);

        if ($grant->tenant) {
            $this->notifyTenantOwner($grant->tenant, $grant, TenantSupportAccessOwnerNotification::EVENT_EXPIRED);
        }

        return true;
    }

    private function notifyTenantOwner(Tenant $tenant, TenantSupportAccessGrant $grant, string $event): void
    {
        $owner = $this->tenantOwner($tenant);

        if (! $owner) {
            return;
        }

        $tenant->loadMissing('domains');
        $grant->loadMissing(['supportUser', 'grantedBy', 'revokedBy']);

        $owner->notify(new TenantSupportAccessOwnerNotification($tenant, $grant, $event));
    }

    private function tenantOwner(Tenant $tenant): ?User
    {
        $membership = $tenant->memberships()
            ->where('role', 'owner')
            ->where('status', 'active')
            ->with('user')
            ->first();

        return $membership?->user;
    }
}
