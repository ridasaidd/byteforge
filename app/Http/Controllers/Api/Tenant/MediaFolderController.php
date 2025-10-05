<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\CreateFolderRequest;
use App\Models\MediaFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaFolderController extends Controller
{
    /**
     * List all folders for the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $query = MediaFolder::forTenant($tenant->id)
            ->with(['parent', 'children'])
            ->withCount('mediaLibraries');

        // Filter by parent
        if ($request->has('parent_id')) {
            if ($request->parent_id === 'null' || $request->parent_id === null) {
                $query->roots();
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        $folders = $query->orderBy('name')->get();

        return response()->json([
            'data' => $folders
        ]);
    }

    /**
     * Create a new folder.
     */
    public function store(CreateFolderRequest $request): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::create([
            'tenant_id' => $tenant->id,
            'name' => $request->name,
            'parent_id' => $request->parent_id,
            'description' => $request->description,
            'metadata' => $request->metadata,
        ]);

        return response()->json([
            'message' => 'Folder created successfully.',
            'folder' => $folder->load('parent'),
        ], 201);
    }

    /**
     * Show a specific folder with its contents.
     */
    public function show(int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::forTenant($tenant->id)
            ->with(['parent', 'children', 'mediaLibraries'])
            ->withCount('mediaLibraries')
            ->findOrFail($id);

        return response()->json([
            'data' => $folder
        ]);
    }

    /**
     * Update a folder.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::forTenant($tenant->id)->findOrFail($id);

        $folder->update($request->only([
            'name',
            'parent_id',
            'description',
            'metadata',
        ]));

        return response()->json([
            'message' => 'Folder updated successfully.',
            'folder' => $folder->fresh(['parent', 'children']),
        ]);
    }

    /**
     * Delete a folder.
     */
    public function destroy(int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::forTenant($tenant->id)
            ->withCount('mediaLibraries')
            ->findOrFail($id);

        // Check if folder has media
        if ($folder->media_libraries_count > 0) {
            return response()->json([
                'message' => 'Cannot delete folder that contains media files.',
            ], 422);
        }

        // Check if folder has children
        if ($folder->children()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete folder that contains subfolders.',
            ], 422);
        }

        $folder->delete();

        return response()->json([
            'message' => 'Folder deleted successfully.',
        ]);
    }

    /**
     * Get folder tree structure.
     */
    public function tree(): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folders = MediaFolder::forTenant($tenant->id)
            ->roots()
            ->with(['children' => function ($query) {
                $query->with('children')->withCount('mediaLibraries');
            }])
            ->withCount('mediaLibraries')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $folders
        ]);
    }
}
