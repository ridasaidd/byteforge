<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Tenant;
use App\Models\TenantAddon;
use Laravel\Pennant\Feature;

/**
 * Busts the Pennant feature cache whenever a TenantAddon record changes.
 *
 * Pennant caches the result of a feature check in the features table so that
 * subsequent requests on the same tenant skip the TenantAddon/addons query.
 * When an add-on is activated or deactivated, this observer immediately
 * invalidates that cached result so the next request re-resolves from source.
 */
class TenantAddonObserver
{
    public function saved(TenantAddon $tenantAddon): void
    {
        $this->forgetFeature($tenantAddon);
    }

    public function deleted(TenantAddon $tenantAddon): void
    {
        $this->forgetFeature($tenantAddon);
    }

    private function forgetFeature(TenantAddon $tenantAddon): void
    {
        $tenantAddon->loadMissing('addon');

        $flag = $tenantAddon->addon?->feature_flag;

        if (! $flag) {
            return;
        }

        $tenant = Tenant::find($tenantAddon->tenant_id);

        if ($tenant) {
            Feature::for($tenant)->forget($flag);
        }
    }
}
