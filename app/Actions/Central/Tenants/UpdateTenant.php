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
        // Use VirtualColumn pattern: set attributes directly on the model
        // Custom columns (id, name, slug) are stored as-is
        // Non-custom columns (email, phone, status) are automatically serialized into the data JSON column

        if (isset($data['name'])) {
            $tenant->name = $data['name'];
            $tenant->slug = Str::slug($data['name']);
        }

        if (isset($data['email'])) {
            $tenant->email = $data['email'];
        }

        if (isset($data['phone'])) {
            $tenant->phone = $data['phone'];
        }

        if (isset($data['status'])) {
            $tenant->status = $data['status'];
        }

        $tenant->save();

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
