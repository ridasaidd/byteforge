<?php

namespace App\Actions\Api\Tenant;

use App\Models\Media;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteMediaAction
{
    use AsAction;

    /**
     * Delete media file and its conversions.
     *
     * @param Media $media
     * @return bool
     */
    public function handle(Media $media): bool
    {
        // Verify the media belongs to current tenant (double-check security)
        if ($media->tenant_id !== tenancy()->tenant->id) {
            abort(403, 'Unauthorized access to media');
        }

        // Delete the media (this will also delete the physical files)
        return $media->delete();
    }
}
