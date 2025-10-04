<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Actions\Tenant\Media\UploadImage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\UpdateImageRequest;
use App\Http\Requests\Tenant\UploadImageRequest;
use App\Models\Media;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $query = Media::forTenant($tenant->id)
            ->with(['folder'])
            ->latest();

        // Filter by folder
        if ($request->has('folder_id')) {
            if ($request->folder_id === 'null' || $request->folder_id === null) {
                $query->rootMedia();
            } else {
                $query->inFolder($request->folder_id);
            }
        }

        // Search by title
        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $media = $query->paginate($request->get('per_page', 20));

        return response()->json($media);
    }

    public function store(UploadImageRequest $request, UploadImage $uploadImage): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $media = $uploadImage->handle(
            file: $request->file('image'),
            tenantId: $tenant->id,
            folderId: $request->input('folder_id'),
            metadata: [
                'title' => $request->input('title'),
                'alt_text' => $request->input('alt_text'),
                'description' => $request->input('description'),
            ]
        );

        return response()->json([
            'message' => 'Image uploaded successfully.',
            'media' => $media->load('folder'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $media = Media::forTenant($tenant->id)
            ->with(['folder'])
            ->findOrFail($id);

        // Get all conversion URLs
        $conversions = [];
        foreach (['thumb', 'small', 'medium', 'large', 'webp'] as $conversion) {
            $conversions[$conversion] = $media->getFirstMediaUrl('images', $conversion);
        }

        return response()->json([
            'media' => $media,
            'urls' => [
                'original' => $media->getFirstMediaUrl('images'),
                'conversions' => $conversions,
            ],
        ]);
    }

    public function update(UpdateImageRequest $request, int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $media = Media::forTenant($tenant->id)->findOrFail($id);

        $media->update($request->only([
            'folder_id',
            'title',
            'alt_text',
            'description',
        ]));

        return response()->json([
            'message' => 'Image updated successfully.',
            'media' => $media->fresh(['folder']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $media = Media::forTenant($tenant->id)->findOrFail($id);

        // Delete the media file from storage and database
        $media->clearMediaCollection('images');
        $media->delete();

        return response()->json([
            'message' => 'Image deleted successfully.',
        ]);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:media_items,id'],
        ]);

        $tenant = tenancy()->tenant;

        $media = Media::forTenant($tenant->id)
            ->whereIn('id', $request->ids)
            ->get();

        foreach ($media as $item) {
            $item->clearMediaCollection('images');
            $item->delete();
        }

        return response()->json([
            'message' => count($request->ids) . ' image(s) deleted successfully.',
        ]);
    }
}
