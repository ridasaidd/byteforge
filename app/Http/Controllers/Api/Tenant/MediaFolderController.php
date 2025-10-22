<?php

namespace App\Http\Controllers\Api\Tenant;

use App\Actions\Api\Tenant\DeleteFolderAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\CreateFolderRequest;
use App\Models\MediaFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaFolderController extends Controller
{
    /**
     * List all folders for the current tenant or central.
     */
    public function index(Request $request): JsonResponse
    {
        // Handle both tenant and central context
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        $query = MediaFolder::query()
            ->where('tenant_id', $tenantId)
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
            'data' => $folders,
        ]);
    }

    /**
     * Create a new folder.
     */
    public function store(CreateFolderRequest $request): JsonResponse
    {
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        $folder = MediaFolder::create([
            'tenant_id' => $tenantId,
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
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        $folder = MediaFolder::where('tenant_id', $tenantId)
            ->with(['parent', 'children', 'mediaLibraries'])
            ->withCount('mediaLibraries')
            ->findOrFail($id);

        return response()->json([
            'data' => $folder,
        ]);
    }

    /**
     * Update a folder.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        $folder = MediaFolder::where('tenant_id', $tenantId)->findOrFail($id);

        // Validate the update
        $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($tenantId, $folder) {
                    // Check if another folder with the same name exists in the same parent
                    $query = MediaFolder::where('tenant_id', $tenantId)
                        ->where('name', $value)
                        ->where('parent_id', $folder->parent_id)
                        ->where('id', '!=', $folder->id);
                    
                    if ($query->exists()) {
                        $fail('A folder with this name already exists in this location.');
                    }
                },
            ],
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:media_folders,id'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ]);

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
     * Delete a folder and all its contents (cascade).
     */
    public function destroy(int $id, DeleteFolderAction $action): JsonResponse
    {
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        $folder = MediaFolder::where('tenant_id', $tenantId)->findOrFail($id);

        // Use the action to cascade delete
        $stats = $action->handle($folder);

        return response()->json([
            'message' => 'Folder and all contents deleted successfully.',
            'stats' => $stats,
        ]);
    }

    /**
     * Get folder tree structure.
     */
    public function tree(): JsonResponse
    {
        $tenantId = tenancy()->initialized ? tenancy()->tenant->id : null;

        $folders = MediaFolder::where('tenant_id', $tenantId)
            ->roots()
            ->with(['children' => function ($query) {
                $query->with('children')->withCount('mediaLibraries');
            }])
            ->withCount('mediaLibraries')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $folders,
        ]);
    }
}
