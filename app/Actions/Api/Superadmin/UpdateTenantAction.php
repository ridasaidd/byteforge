<?php

namespace App\Actions\Api\Superadmin;

use App\Models\Tenant;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateTenantAction
{
    use AsAction;

    public function handle(Tenant $tenant, array $data): array
    {
        return $this->execute($tenant, $data);
    }

    public function execute(Tenant $tenant, array $data): array
    {
        $domainId = $tenant->domains->first()->id ?? 'NULL';

        $validated = Validator::make($data, [
            'name' => 'sometimes|required|string|max:255',
            'domain' => 'sometimes|required|string|max:255|unique:domains,domain,'.$domainId,
        ])->validate();

        // Update tenant
        if (isset($validated['name'])) {
            $tenant->update([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']),
            ]);
        }

        // Update domain if provided
        if (isset($validated['domain'])) {
            $domain = $tenant->domains()->first();
            if ($domain) {
                $domain->update(['domain' => $validated['domain']]);
            }
        }

        $tenant->refresh()->load('domains');

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domains->first()->domain ?? null,
            'created_at' => $tenant->created_at->toISOString(),
            'updated_at' => $tenant->updated_at->toISOString(),
        ];
    }
}
