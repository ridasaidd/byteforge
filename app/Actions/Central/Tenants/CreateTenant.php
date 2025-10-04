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

        // Use VirtualColumn pattern: set attributes directly
        // Custom columns: id, name, slug
        // Non-custom (email, phone, status) go into data JSON automatically
        $tenant = new Tenant();
        $tenant->id = $data['id'];
        $tenant->name = $data['name'];
        $tenant->slug = $data['slug'] ?? Str::slug($data['name']);
        
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

        // Create domain for tenant
        $tenant->domains()->create([
            'domain' => $data['domain'],
        ]);

        return $tenant->load('domains');
    }
}
