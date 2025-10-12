<?php

namespace App\Actions\Api\Superadmin;

use App\Models\Tenant;
use Lorisleiva\Actions\Concerns\AsAction;

class ListTenantsAction
{
    use AsAction;

    public function handle(array $filters = []): array
    {
        return $this->execute($filters);
    }

    public function execute(array $filters = []): array
    {
        $query = Tenant::with('domains');

        // Search
        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhereHas('domains', function ($dq) use ($search) {
                      $dq->where('domain', 'like', "%{$search}%");
                  });
            });
        }

        // Pagination
        $perPage = $filters['per_page'] ?? 15;
        $tenants = $query->paginate($perPage);

        // Transform data to include primary domain
        $data = collect($tenants->items())->map(function ($tenant) {
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'domain' => $tenant->domains->first()->domain ?? null,
                'created_at' => $tenant->created_at->toISOString(),
                'updated_at' => $tenant->updated_at->toISOString(),
            ];
        })->toArray();

        return [
            'data' => $data,
            'meta' => [
                'current_page' => $tenants->currentPage(),
                'last_page' => $tenants->lastPage(),
                'per_page' => $tenants->perPage(),
                'total' => $tenants->total(),
            ],
        ];
    }
}
