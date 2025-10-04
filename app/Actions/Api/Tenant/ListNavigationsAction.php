<?php

namespace App\Actions\Api\Tenant;

use App\Models\Navigation;
use Lorisleiva\Actions\Concerns\AsAction;

class ListNavigationsAction
{
    use AsAction;

    public function execute(array $filters = [])
    {
        $query = Navigation::where('tenant_id', tenancy()->tenant->id);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $navigations = $query->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'data' => $navigations->map(function ($navigation) {
                return [
                    'id' => $navigation->id,
                    'tenant_id' => $navigation->tenant_id,
                    'name' => $navigation->name,
                    'slug' => $navigation->slug,
                    'structure' => $navigation->structure,
                    'status' => $navigation->status,
                    'sort_order' => $navigation->sort_order,
                    'created_by' => $navigation->created_by,
                    'created_at' => $navigation->created_at,
                    'updated_at' => $navigation->updated_at,
                ];
            })
        ];
    }
}
