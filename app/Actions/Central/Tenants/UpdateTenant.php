<?php

namespace App\Actions\Central\Tenants;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\Tenant;
use Illuminate\Support\Str;

class UpdateTenant
{
    use AsAction;

    public function handle(Tenant $tenant, array $data): Tenant
    {
        // Update basic tenant info
        $updateData = [];
        if (isset($data['name'])) {
            $updateData['name'] = $data['name'];
            $updateData['slug'] = Str::slug($data['name']);
        }

        // Update data column with extra attributes (preserve existing data)
        $tenantData = is_array($tenant->data) ? $tenant->data : [];
        if (isset($data['email'])) {
            $tenantData['email'] = $data['email'];
        }
        if (isset($data['phone'])) {
            $tenantData['phone'] = $data['phone'];
        }
        if (isset($data['status'])) {
            $tenantData['status'] = $data['status'];
        }

        // Only update data if we have changes
        if (!empty($tenantData)) {
            $updateData['data'] = $tenantData;
        }

        if (!empty($updateData)) {
            $tenant->update($updateData);
        }

        // Update domain if provided
        if (isset($data['domain'])) {
            $primaryDomain = $tenant->domains()->first();
            if ($primaryDomain) {
                $primaryDomain->update(['domain' => $data['domain']]);
            } else {
                $tenant->domains()->create(['domain' => $data['domain']]);
            }
        }

        return $tenant->fresh()->load('domains');
    }
}
