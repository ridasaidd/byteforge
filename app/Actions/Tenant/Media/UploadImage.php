<?php

namespace App\Actions\Tenant\Media;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;

class UploadImage
{
    use AsAction;

    public function handle(
        UploadedFile $file,
        string $tenantId,
        ?int $folderId = null,
        array $metadata = []
    ): Media {
        // Create media record
        $media = Media::create([
            'tenant_id' => $tenantId,
            'folder_id' => $folderId,
            'title' => $metadata['title'] ?? null,
            'alt_text' => $metadata['alt_text'] ?? null,
            'description' => $metadata['description'] ?? null,
        ]);

        // Add file to media library (will auto-generate conversions)
        $media->addMedia($file)
            ->withCustomProperties([
                'uploaded_by' => Auth::id(),
                'original_name' => $file->getClientOriginalName(),
            ])
            ->toMediaCollection('images', 'public');

        return $media->fresh();
    }
}
