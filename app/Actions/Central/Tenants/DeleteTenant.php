<?php

namespace App\Actions\Central\Tenants;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\Tenant;

class DeleteTenant
{
    use AsAction;

    public function handle(Tenant $tenant): bool
    {
        // Delete all memberships first
        $tenant->memberships()->delete();

        // Delete all domains
        $tenant->domains()->delete();

        // Delete the tenant (don't trigger job pipeline)
        $tenant->withoutEvents(function () use ($tenant) {
            $tenant->forceDelete();
        });

        return true;
    }
}
