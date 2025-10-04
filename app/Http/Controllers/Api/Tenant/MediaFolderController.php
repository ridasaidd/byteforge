<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Actions\Tenant\MediaFolders\CreateFolder;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\CreateFolderRequest;
use App\Models\MediaFolder;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaFolderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $query = MediaFolder::forTenant($tenant->id)
            ->with(['parent', 'children'])
            ->withCount('media');

        // Get only root folders if requested
        if ($request->boolean('roots_only')) {
            $query->roots();
        }

        // Filter by parent
        if ($request->has('parent_id')) {
            if ($request->parent_id === 'null' || $request->parent_id === null) {
                $query->roots();
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        $folders = $query->orderBy('name')->get();

        return response()->json($folders);
    }

    public function store(CreateFolderRequest $request, CreateFolder $createFolder): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = $createFolder->handle(
            tenantId: $tenant->id,
            data: [
                'name' => $request->input('name'),
                'parent_id' => $request->input('parent_id'),
                'description' => $request->input('description'),
            ]
        );

        return response()->json([
            'message' => 'Folder created successfully.',
            'folder' => $folder->load(['parent', 'children']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::forTenant($tenant->id)
            ->with(['parent', 'children'])
            ->withCount('media')
            ->findOrFail($id);

        return response()->json($folder);
    }

    public function update(CreateFolderRequest $request, int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::forTenant($tenant->id)->findOrFail($id);

        $folder->update($request->only([
            'name',
            'parent_id',
            'description',
        ]));

        return response()->json([
            'message' => 'Folder updated successfully.',
            'folder' => $folder->fresh(['parent', 'children']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $tenant = tenancy()->tenant;

        $folder = MediaFolder::forTenant($tenant->id)->findOrFail($id);

        // Check if folder has media or subfolders
        if ($folder->media()->exists() || $folder->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete folder with media or subfolders. Please delete or move contents first.',
            ], 422);
        }

        $folder->delete();

        return response()->json([
            'message' => 'Folder deleted successfully.',
        ]);
    }

    public function tree(): JsonResponse
    {
        $tenant = tenancy()->tenant;

        // Get all folders and build tree structure
        $folders = MediaFolder::forTenant($tenant->id)
            ->with('children')
            ->withCount('media')
            ->roots()
            ->orderBy('name')
            ->get();

        return response()->json($folders);
    }
}
