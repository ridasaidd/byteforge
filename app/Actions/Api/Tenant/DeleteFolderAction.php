<?php

namespace App\Actions\Api\Tenant;

use App\Models\MediaFolder;
use App\Models\MediaLibrary;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteFolderAction
{
    use AsAction;

    /**
     * Delete a folder and all its contents recursively.
     * This includes all nested folders and their media files.
     */
    public function handle(MediaFolder $folder): array
    {
        $stats = [
            'folders_deleted' => 0,
            'files_deleted' => 0,
        ];

        // Recursively delete folder and contents
        $this->deleteFolderRecursive($folder, $stats);

        return $stats;
    }

    /**
     * Recursively delete a folder, its children, and all media.
     */
    private function deleteFolderRecursive(MediaFolder $folder, array &$stats): void
    {
        // First, recursively delete all child folders
        $children = $folder->children()->get();
        foreach ($children as $child) {
            $this->deleteFolderRecursive($child, $stats);
        }

        // Delete all media in this folder
        $mediaLibraries = MediaLibrary::where('folder_id', $folder->id)->get();
        foreach ($mediaLibraries as $mediaLibrary) {
            // Delete all associated media files (this triggers Spatie's media deletion)
            $media = $mediaLibrary->getMedia();
            foreach ($media as $mediaItem) {
                $mediaItem->delete();
                $stats['files_deleted']++;
            }
            
            // Delete the media library record
            $mediaLibrary->delete();
        }

        // Finally, delete the folder itself
        $folder->delete();
        $stats['folders_deleted']++;
    }
}

