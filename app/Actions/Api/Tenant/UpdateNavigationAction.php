<?php

namespace App\Actions\Api\Tenant;

use App\Models\Navigation;
use Illuminate\Validation\ValidationException;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateNavigationAction
{
    use AsAction;

    public function execute(Navigation $navigation, array $data)
    {
        // Validate slug uniqueness if slug is being changed
        if (isset($data['slug']) && $data['slug'] !== $navigation->slug) {
            $existingNavigation = Navigation::where('tenant_id', tenancy()->tenant->id)
                ->where('slug', $data['slug'])
                ->where('id', '!=', $navigation->id)
                ->first();

            if ($existingNavigation) {
                throw ValidationException::withMessages([
                    'slug' => ['The slug has already been taken for this tenant.'],
                ]);
            }
        }

        // Update navigation
        $navigation->update(array_filter([
            'name' => $data['name'] ?? $navigation->name,
            'slug' => $data['slug'] ?? $navigation->slug,
            'structure' => $data['structure'] ?? $navigation->structure,
            'status' => $data['status'] ?? $navigation->status,
            'sort_order' => $data['sort_order'] ?? $navigation->sort_order,
        ]));

        return $navigation->fresh();
    }
}
