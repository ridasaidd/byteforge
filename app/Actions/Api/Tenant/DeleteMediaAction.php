<?php

namespace App\Actions\Api\Tenant;

use App\Models\Media;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteMediaAction
{
    use AsAction;

    /**
     * Delete media file and its conversions.
     */
    public function handle(Media $media): bool
    {
        // Verify the media belongs to current tenant/central context (double-check security)
        if (tenancy()->initialized) {
            if ($media->tenant_id !== tenancy()->tenant->id) {
                abort(403, 'Unauthorized access to media');
            }
        } else {
            // In central context, only allow deleting media without tenant_id
            if ($media->tenant_id !== null) {
                abort(403, 'Unauthorized access to media');
            }
        }

        // Delete the media (this will also delete the physical files)
        return $media->delete();
    }
}
