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
     */
    public function handle(array $filters = []): LengthAwarePaginator
    {
        // Remove global scope to avoid ambiguous tenant_id in JOINs
        $query = Media::withoutGlobalScope('tenant')
            ->orderBy('media.created_at', 'desc');

        // Exclude system collections (avatar, profile, etc.)
        $excludedCollections = ['avatar', 'avatars', 'profile', 'profiles'];
        $query->whereNotIn('media.collection_name', $excludedCollections);

        // Only show media attached to MediaLibrary (not avatars, etc.)
        $query->where('media.model_type', 'App\Models\MediaLibrary');
        
        // Explicitly handle tenant_id check for central context (prevent ambiguity in joins)
        if (tenancy()->initialized) {
            $query->where('media.tenant_id', tenancy()->tenant->id);
        } else {
            $query->whereNull('media.tenant_id');
        }

        // ALWAYS filter by folder - use join for better performance
        // Default to root folder (null) if not specified
        $folderId = $filters['folder_id'] ?? null;
        
        // Join with media_libraries to filter by folder_id
        $query->join('media_libraries', function ($join) use ($folderId) {
            $join->on('media.model_id', '=', 'media_libraries.id')
                ->where('media.model_type', '=', 'App\Models\MediaLibrary');
                
            if ($folderId === null || $folderId === 'null' || $folderId === '') {
                $join->whereNull('media_libraries.folder_id');
            } else {
                $join->where('media_libraries.folder_id', '=', $folderId);
            }
        })
        ->select('media.*'); // Only select media columns to avoid duplicates

        // Filter by collection
        if (! empty($filters['collection'])) {
            $query->where('media.collection_name', $filters['collection']);
        }

        // Filter by mime type
        if (! empty($filters['mime_type'])) {
            $query->where('media.mime_type', 'like', $filters['mime_type'].'%');
        }

        // Search by name
        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('media.name', 'like', '%'.$filters['search'].'%')
                    ->orWhere('media.file_name', 'like', '%'.$filters['search'].'%');
            });
        }

        // Filter by model type (what the media is attached to)
        if (! empty($filters['model_type'])) {
            $query->where('media.model_type', $filters['model_type']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }
}
