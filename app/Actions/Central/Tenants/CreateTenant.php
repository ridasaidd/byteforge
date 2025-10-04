<?php

namespace App\Actions\Central\Tenants;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\Tenant;
use Illuminate\Support\Str;

class CreateTenant
{
    use AsAction;

    public function handle(array $data): Tenant
    {
        // Generate tenant ID from name if not provided
        if (empty($data['id'])) {
            $data['id'] = Str::slug($data['name']);
        }

        // Create tenant with data column for extra attributes
        $tenantData = [];
        if (isset($data['email'])) {
            $tenantData['email'] = $data['email'];
        }
        if (isset($data['phone'])) {
            $tenantData['phone'] = $data['phone'];
        }
        if (isset($data['status'])) {
            $tenantData['status'] = $data['status'];
        }

        $tenant = Tenant::create([
            'id' => $data['id'],
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'data' => $tenantData,
        ]);

        // Create domain for tenant
        $tenant->domains()->create([
            'domain' => $data['domain'],
        ]);

        return $tenant->load('domains');
    }
}
