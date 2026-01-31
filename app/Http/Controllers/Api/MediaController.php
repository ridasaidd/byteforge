<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\Tenant\DeleteMediaAction;
use App\Actions\Api\Tenant\ListMediaAction;
use App\Actions\Api\Tenant\UploadMediaAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\UploadMediaRequest;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    /**
     * Get all available conversion URLs for a media item.
     */
    private function getConversionUrls(Media $media): array
    {
        $conversions = [];

        // Only images have conversions
        if (!str_starts_with($media->mime_type ?? '', 'image/')) {
            return $conversions;
        }

        $availableConversions = ['thumb', 'small', 'medium', 'large', 'webp'];

        foreach ($availableConversions as $conversion) {
            if ($media->hasGeneratedConversion($conversion)) {
                $conversions[$conversion] = $media->getUrl($conversion);
            }
        }

        return $conversions;
    }

    /**
     * List all media for the current tenant.
     */
    public function index(Request $request, ListMediaAction $action): JsonResponse
    {
        $filters = $request->only(['collection', 'mime_type', 'search', 'model_type', 'per_page', 'folder_id']);
        $paginated = $action->handle($filters);

        // Transform media items to include URLs
        $items = $paginated->getCollection()->map(function ($media) {
            $conversions = $this->getConversionUrls($media);

            return [
                'id' => $media->id,
                'uuid' => $media->uuid,
                'name' => $media->name,
                'file_name' => $media->file_name,
                'mime_type' => $media->mime_type,
                'size' => $media->size,
                'human_readable_size' => $media->human_readable_size,
                'collection_name' => $media->collection_name,
                'custom_properties' => $media->custom_properties,
                'model_type' => $media->model_type,
                'model_id' => $media->model_id,
                'url' => $media->getUrl(),
                'thumbnail_url' => $conversions['thumb'] ?? null,
                'small_url' => $conversions['small'] ?? null,
                'medium_url' => $conversions['medium'] ?? null,
                'large_url' => $conversions['large'] ?? null,
                'webp_url' => $conversions['webp'] ?? null,
                'created_at' => $media->created_at?->toISOString(),
                'updated_at' => $media->updated_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'from' => $paginated->firstItem(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'to' => $paginated->lastItem(),
                'total' => $paginated->total(),
            ],
            'links' => [
                'first' => $paginated->url(1),
                'last' => $paginated->url($paginated->lastPage()),
                'prev' => $paginated->previousPageUrl(),
                'next' => $paginated->nextPageUrl(),
            ],
        ]);
    }

    /**
     * Upload a new media file.
     */
    public function store(UploadMediaRequest $request, UploadMediaAction $action): JsonResponse
    {
        try {
            $media = $action->handle(
                $request->file('file'),
                $request->input('collection', 'default'),
                $request->input('custom_properties', []),
                $request->input('folder_id')
            );

            $conversions = $this->getConversionUrls($media);

            return response()->json([
                'message' => 'Media uploaded successfully',
                'data' => [
                    'id' => $media->id,
                    'uuid' => $media->uuid,
                    'name' => $media->name,
                    'file_name' => $media->file_name,
                    'mime_type' => $media->mime_type,
                    'size' => $media->size,
                    'collection_name' => $media->collection_name,
                    'url' => $media->getUrl(),
                    'thumbnail_url' => $conversions['thumb'] ?? null,
                    'small_url' => $conversions['small'] ?? null,
                    'medium_url' => $conversions['medium'] ?? null,
                    'large_url' => $conversions['large'] ?? null,
                    'webp_url' => $conversions['webp'] ?? null,
                    'custom_properties' => $media->custom_properties,
                    'created_at' => $media->created_at?->toISOString(),
                ],
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Media upload failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to upload media',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show a specific media file.
     */
    public function show(int $media): JsonResponse
    {
        $media = Media::where('tenant_id', tenant('id'))
            ->findOrFail($media);

        $data = [
            'id' => $media->id,
            'uuid' => $media->uuid,
            'name' => $media->name,
            'file_name' => $media->file_name,
            'mime_type' => $media->mime_type,
            'size' => $media->size,
            'human_readable_size' => $media->size ? $media->human_readable_size : '0 bytes',
            'collection_name' => $media->collection_name,
            'custom_properties' => $media->custom_properties,
            'model_type' => $media->model_type,
            'model_id' => $media->model_id,
            'created_at' => $media->created_at?->toISOString(),
            'updated_at' => $media->updated_at?->toISOString(),
        ];

        // Only include URL if disk is set (to avoid errors in tests with fake storage)
        if ($media->disk) {
            $conversions = $this->getConversionUrls($media);
            $data['url'] = $media->getUrl();
            $data['thumbnail_url'] = $conversions['thumb'] ?? null;
            $data['small_url'] = $conversions['small'] ?? null;
            $data['medium_url'] = $conversions['medium'] ?? null;
            $data['large_url'] = $conversions['large'] ?? null;
            $data['webp_url'] = $conversions['webp'] ?? null;
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Delete a media file.
     */
    public function destroy(int $media, DeleteMediaAction $action): JsonResponse
    {
        try {
            // Support both tenant and central context
            if (tenancy()->initialized) {
                $media = Media::where('tenant_id', tenancy()->tenant->id)
                    ->findOrFail($media);
            } else {
                $media = Media::whereNull('tenant_id')
                    ->findOrFail($media);
            }

            $action->handle($media);

            return response()->json([
                'message' => 'Media deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete media',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
