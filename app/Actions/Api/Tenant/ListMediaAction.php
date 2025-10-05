<?php

namespace App\Actions\Api\Tenant;

use App\Models\Media;
use Illuminate\Pagination\LengthAwarePaginator;
use Lorisleiva\Actions\Concerns\AsAction;

class ListMediaAction
{
    use AsAction;

    /**
     * List media for the current tenant with filtering.
     *
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function handle(array $filters = []): LengthAwarePaginator
    {
        $query = Media::query()
            ->orderBy('created_at', 'desc');

        // Filter by collection
        if (!empty($filters['collection'])) {
            $query->where('collection_name', $filters['collection']);
        }

        // Filter by mime type
        if (!empty($filters['mime_type'])) {
            $query->where('mime_type', 'like', $filters['mime_type'] . '%');
        }

        // Search by name
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('file_name', 'like', '%' . $filters['search'] . '%');
            });
        }

        // Filter by model type (what the media is attached to)
        if (!empty($filters['model_type'])) {
            $query->where('model_type', $filters['model_type']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }
}
