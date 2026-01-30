<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Models\ThemePlaceholder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Theme Placeholder Controller
 *
 * Handles saving placeholder content for theme blueprints.
 * Called by Theme Builder when editing/saving theme structure.
 *
 * This is where blueprint content lives (header, footer, sidebar placeholders, etc.)
 * When a theme is activated, this placeholder content is copied to theme_parts instances.
 */
class ThemePlaceholderController extends Controller
{
    public function index(Theme $theme): JsonResponse
    {
        if (!request()->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Only allowed for system themes (blueprints)
        if (!$theme->is_system_theme || $theme->tenant_id !== null) {
            return response()->json([
                'message' => 'Placeholders can only be managed for system themes',
            ], 403);
        }

        $placeholders = $theme->placeholders()->get()->groupBy('type');

        return response()->json([
            'data' => $placeholders,
        ]);
    }

    /**
     * Get placeholder for a specific section
     * GET /api/superadmin/themes/{theme}/placeholders/{section}
     */
    public function show(Theme $theme, string $section): JsonResponse
    {
        if (!request()->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Only allowed for system themes (blueprints)
        if (!$theme->is_system_theme || $theme->tenant_id !== null) {
            return response()->json([
                'message' => 'Placeholders can only be managed for system themes',
            ], 403);
        }

        $placeholder = ThemePlaceholder::where('theme_id', $theme->id)
            ->where('type', $section)
            ->first();

        if (!$placeholder) {
            return response()->json([
                'message' => 'Placeholder not found',
            ], 404);
        }

        return response()->json([
            'data' => $placeholder,
        ]);
    }

    /**
     * Save/update placeholder content for a section
     * POST /api/superadmin/themes/{theme}/placeholders/{section}
     */
    public function store(Request $request, Theme $theme, string $section): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Only allowed for system themes (blueprints)
        if (!$theme->is_system_theme || $theme->tenant_id !== null) {
            return response()->json([
                'message' => 'Placeholders can only be managed for system themes',
            ], 403);
        }

        $validated = $request->validate([
            'content' => 'required|array',
        ]);

        // Find or create placeholder
        $placeholder = ThemePlaceholder::firstOrCreate(
            [
                'theme_id' => $theme->id,
                'type' => $section,
            ],
            [
                'content' => $validated['content'],
            ]
        );

        // Update if it already exists
        if ($placeholder->wasRecentlyCreated === false) {
            $placeholder->update(['content' => $validated['content']]);
        }

        return response()->json([
            'data' => $placeholder,
            'message' => ucfirst($section) . ' placeholder saved successfully',
        ]);
    }

    /**
     * Delete placeholder for a section
     * DELETE /api/superadmin/themes/{theme}/placeholders/{section}
     */
    public function destroy(Theme $theme, string $section): JsonResponse
    {
        if (!request()->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Only allowed for system themes (blueprints)
        if (!$theme->is_system_theme || $theme->tenant_id !== null) {
            return response()->json([
                'message' => 'Placeholders can only be managed for system themes',
            ], 403);
        }

        $placeholder = ThemePlaceholder::where('theme_id', $theme->id)
            ->where('type', $section)
            ->first();

        if (!$placeholder) {
            return response()->json([
                'message' => 'Placeholder not found',
            ], 404);
        }

        $placeholder->delete();

        return response()->json([
            'message' => ucfirst($section) . ' placeholder deleted successfully',
        ]);
    }
}
