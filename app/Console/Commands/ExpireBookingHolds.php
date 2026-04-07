<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Tenant;
use App\Models\TenantAddon;
use Illuminate\Console\Command;

/**
 * Expires bookings that were created as a `pending_hold` but whose hold
 * window has elapsed without payment or confirmation.
 *
 * Runs every minute. Deletes expired hold bookings; the availability engine
 * will naturally make the slots available again via the confirmed() scope.
 *
 * Only processes tenants with an active 'booking' addon.
 */
class ExpireBookingHolds extends Command
{
    protected $signature = 'bookings:expire-holds';

    protected $description = 'Expire booking holds whose hold_expires_at has passed';

    public function handle(): int
    {
        $tenantIds = TenantAddon::active()
            ->whereHas('addon', fn ($q) => $q->where('feature_flag', 'booking'))
            ->pluck('tenant_id');

        if ($tenantIds->isEmpty()) {
            return self::SUCCESS;
        }

        foreach ($tenantIds as $tenantId) {
            $tenant = Tenant::find($tenantId);
            if (! $tenant) {
                continue;
            }

            tenancy()->initialize($tenant);

            try {
                Booking::query()
                    ->where('status', Booking::STATUS_PENDING_HOLD)
                    ->where('hold_expires_at', '<', now())
                    ->delete();
            } finally {
                tenancy()->end();
            }
        }

        return self::SUCCESS;
    }
}
