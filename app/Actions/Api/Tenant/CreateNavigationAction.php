<?php

namespace App\Actions\Api\Tenant;

use App\Models\Navigation;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateNavigationAction
{
    use AsAction;

    public function execute(array $data, $user)
    {
        // Determine tenant ID (null for central context)
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        // Validate slug uniqueness for this tenant/central
        $existingNavigation = $tenantId === null
            ? Navigation::whereNull('tenant_id')->where('slug', $data['slug'])->first()
            : Navigation::where('tenant_id', $tenantId)->where('slug', $data['slug'])->first();

        if ($existingNavigation) {
            throw ValidationException::withMessages([
                'slug' => ['The slug has already been taken.'],
            ]);
        }

        // Create navigation
        $navigation = Navigation::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'slug' => $data['slug'],
            'structure' => $data['structure'] ?? [],
            'status' => $data['status'] ?? 'draft',
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => $user->id,
        ]);

        return $navigation;
    }
}
