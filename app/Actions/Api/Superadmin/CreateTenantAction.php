<?php

namespace App\Actions\Api\Superadmin;

use App\Models\Tenant;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Lorisleiva\Actions\Concerns\AsAction;
use Stancl\Tenancy\Database\Models\Domain;

class CreateTenantAction
{
    use AsAction;

    public function handle(array $data): array
    {
        return $this->execute($data);
    }

    public function execute(array $data): array
    {
        $validated = Validator::make($data, [
            'name' => 'required|string|max:255',
            'domain' => 'required|string|max:255|unique:domains,domain',
        ])->validate();

        // Create tenant
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
        ]);

        // Create domain for the tenant
        $domain = Domain::create([
            'domain' => $validated['domain'],
            'tenant_id' => $tenant->id,
        ]);

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $domain->domain,
            'created_at' => $tenant->created_at->toISOString(),
            'updated_at' => $tenant->updated_at->toISOString(),
        ];
    }
}
