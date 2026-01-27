<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Services\ThemeCssSectionService;
use App\Services\ThemeCssPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ThemeCssController extends Controller
{
    public function __construct(
        private ThemeCssSectionService $sectionService,
        private ThemeCssPublishService $publishService,
    ) {
    }

    /**
     * Save CSS for a specific theme section
     * POST /api/superadmin/themes/{id}/sections/{section}
     */
    public function saveSection(Request $request, Theme $theme, string $section): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        $validated = $request->validate([
            'css' => 'required|string',
        ]);

        // Initialize folder if needed
        if (!Storage::disk('public')->exists("themes/{$theme->id}")) {
            $this->sectionService->initializeThemeFolder($theme);
        }

        $this->sectionService->saveSectionCss($theme->id, $section, $validated['css']);

        return response()->json(['success' => true]);
    }

    /**
     * Get CSS for a specific theme section
     * GET /api/superadmin/themes/{id}/sections/{section}
     */
    public function getSection(Request $request, Theme $theme, string $section): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        $css = $this->sectionService->getSectionCss($theme->id, $section);

        if (!$css) {
            return response()->json(['css' => null], 404);
        }

        return response()->json(['css' => $css]);
    }

    /**
     * Validate that all required sections are present
     * GET /api/superadmin/themes/{id}/publish/validate
     */
    public function validatePublish(Request $request, Theme $theme): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        $missing = $this->publishService->validateRequiredSections($theme->id);

        return response()->json([
            'valid' => empty($missing),
            'missing' => $missing,
        ]);
    }

    /**
     * Publish theme: merge all sections into master CSS file
     * POST /api/superadmin/themes/{id}/publish
     */
    public function publish(Request $request, Theme $theme): JsonResponse
    {
        if (!$request->user()->hasPermissionTo('themes.manage')) {
            return response()->json([
                'message' => 'Unauthorized: You do not have permission to manage themes.',
            ], 403);
        }

        // Validate before publishing
        $missing = $this->publishService->validateRequiredSections($theme->id);

        if (!empty($missing)) {
            throw ValidationException::withMessages([
                'publish' => 'Missing required sections: ' . implode(', ', $missing),
            ]);
        }

        try {
            $cssUrl = $this->publishService->publishTheme($theme->id);

            return response()->json(['cssUrl' => $cssUrl]);
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'publish' => $e->getMessage(),
            ]);
        }
    }
}
