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

        // Get the directory path before deletion for cleanup
        $mediaPath = $media->getPath();
        $directory = dirname($mediaPath);

        // Delete the media (this will also delete the physical files and conversions)
        $deleted = $media->delete();

        // Clean up empty parent directories after deletion
        if ($deleted) {
            $this->cleanupEmptyDirectories($directory);
        }

        return $deleted;
    }

    /**
     * Recursively remove empty parent directories up to the storage root.
     */
    private function cleanupEmptyDirectories(string $directory): void
    {
        // Safety check: only clean up within storage/app/public
        $storagePublic = storage_path('app/public');
        if (!str_starts_with($directory, $storagePublic)) {
            return;
        }

        // Don't delete the root storage directories
        if ($directory === $storagePublic || dirname($directory) === $storagePublic) {
            return;
        }

        // Check if directory is empty
        if (is_dir($directory) && count(scandir($directory)) === 2) { // Only . and ..
            // Remove the empty directory
            @rmdir($directory);

            // Recursively check and remove parent if it's now empty
            $this->cleanupEmptyDirectories(dirname($directory));
        }
    }
}
