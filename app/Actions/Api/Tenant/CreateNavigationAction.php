<?php

namespace App\Actions\Api\Tenant;

use App\Models\Navigation;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateNavigationAction
{
    use AsAction;

    public function execute(array $data, $user)
    {
        // Validate slug uniqueness for this tenant
        $existingNavigation = Navigation::where('tenant_id', tenancy()->tenant->id)
            ->where('slug', $data['slug'])
            ->first();

        if ($existingNavigation) {
            throw ValidationException::withMessages([
                'slug' => ['The slug has already been taken for this tenant.']
            ]);
        }

        // Create navigation
        $navigation = Navigation::create([
            'tenant_id' => tenancy()->tenant->id,
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
