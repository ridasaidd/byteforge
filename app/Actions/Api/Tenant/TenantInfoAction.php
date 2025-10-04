<?php

namespace App\Actions\Api\Tenant;

use App\Models\Tenant;

class TenantInfoAction
{
    public function execute(): array
    {
        $tenant = tenancy()->tenant;

        if (!$tenant) {
            throw new \Exception('No tenant found');
        }

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domains' => $tenant->domains->pluck('domain')->toArray(),
        ];
    }
}
