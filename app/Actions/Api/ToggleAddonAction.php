<?php

namespace App\Actions\Api;

use App\Models\Addon;
use App\Models\Tenant;
use App\Services\BillingService;
use Lorisleiva\Actions\Concerns\AsAction;

class ToggleAddonAction
{
    use AsAction;

    public function handle(Tenant $tenant, Addon $addon, string $operation): array
    {
        $service = app(BillingService::class);

        if ($operation === 'activate') {
            return $service->activateAddon($tenant, $addon);
        }

        return $service->deactivateAddon($tenant, $addon);
    }
}
