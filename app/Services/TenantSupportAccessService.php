<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Membership;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Models\TenantSupportAccessGrant;
use App\Models\User;
use App\Models\WebRefreshSession;
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

            return $grant->load(['supportUser', 'grantedBy', 'membership']);
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

            $this->revokeRefreshSessions($grant->support_user_id, $grant->tenant_id, $now);
            $this->logCentralRevoke($grant, $actor, $reason);
            $this->logTenantRevoke($grant, $actor, $reason);

            return $grant->fresh(['supportUser', 'grantedBy', 'revokedBy', 'membership']);
        });
    }

    public function expireSupportAccessIfNeeded(User $user, string $tenantId): void
    {
        $membership = Membership::query()
            ->where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->where('source', self::MEMBERSHIP_SOURCE)
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->first();

        if (! $membership) {
            return;
        }

        DB::transaction(function () use ($membership, $user, $tenantId): void {
            $now = now();

            $membership->forceFill([
                'status' => 'expired',
            ])->save();

            $grants = TenantSupportAccessGrant::query()
                ->where('tenant_id', $tenantId)
                ->where('support_user_id', $user->id)
                ->where('status', 'active')
                ->whereNull('revoked_at')
                ->where('expires_at', '<=', $now)
                ->get();

            foreach ($grants as $grant) {
                $grant->forceFill(['status' => 'expired'])->save();
                $this->logTenantExpiry($grant);
            }

            $this->revokeRefreshSessions($user->id, $tenantId, $now);
        });
    }

    public function isSupportAccessMembership(Membership $membership): bool
    {
        return $membership->source === self::MEMBERSHIP_SOURCE;
    }

    private function assertEligibleSupportUser(User $supportUser): void
    {
        if (! $supportUser->hasAnyRole(['support', 'admin'])) {
            throw ValidationException::withMessages([
                'support_user_id' => ['Only central support or admin users may receive temporary support access.'],
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
}
