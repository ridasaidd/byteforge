<?php

namespace App\Actions\Api\Tenant;

use App\Models\Media;
use App\Models\MediaLibrary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Lorisleiva\Actions\Concerns\AsAction;

class UploadMediaAction
{
    use AsAction;

    /**
     * Upload media file to WordPress-style media library.
     * Creates a MediaLibrary entry (container) and attaches the file to it.
     *
     * @param  string|null  $collection  Collection name (images, documents, videos)
     * @param  array  $customProperties  Additional metadata (alt_text, caption, etc.)
     * @param  int|null  $folderId  Optional folder ID for organization
     */
    public function handle(
        UploadedFile $file,
        ?string $collection = 'default',
        array $customProperties = [],
        ?int $folderId = null
    ): Media {
        // Get tenant ID (null for central context)
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        // Create MediaLibrary container entry for this upload
        $mediaLibrary = MediaLibrary::create([
            'tenant_id' => $tenantId,
            'folder_id' => $folderId,
            'name' => $file->getClientOriginalName(),
            'description' => $customProperties['description'] ?? null,
            'uploaded_by' => Auth::id(),
        ]);

        // Determine collection based on mime type if not specified
        if ($collection === 'default') {
            $mimeType = $file->getMimeType();
            if (str_starts_with($mimeType, 'image/')) {
                $collection = 'images';
            } elseif (str_starts_with($mimeType, 'video/')) {
                $collection = 'videos';
            } elseif (in_array($mimeType, ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'])) {
                $collection = 'documents';
            }
        }

        // Attach the file to the MediaLibrary entry
        $media = $mediaLibrary->addMedia($file)
            ->withCustomProperties(array_merge([
                'uploaded_by' => Auth::id(),
                'uploaded_at' => now()->toISOString(),
            ], $customProperties))
            ->toMediaCollection($collection);

        return $media;
    }
}
