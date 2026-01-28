<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Models\ThemePart;
use App\Services\ThemeCssGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Phase 6: Theme Customization Controller
 *
 * Handles customization of theme instances (both central and tenant)
 * Saves CSS to database columns (not disk files)
 * Allows customization of: Settings, Header, Footer (NOT Info or Pages/Templates)
 */
class ThemeCustomizationController extends Controller
{
    protected ThemeCssGeneratorService $cssGenerator;

    public function __construct(ThemeCssGeneratorService $cssGenerator)
    {
        $this->cssGenerator = $cssGenerator;
    }

    /**
     * Get customization CSS for all sections
     */
    public function getCustomization(Theme $theme)
    {
        // Authorize: user must own this theme
        $this->authorizeThemeAccess($theme);

        return response()->json([
            'data' => [
                'settings_css' => $theme->settings_css,
                'header_css' => $theme->header_css,
                'footer_css' => $theme->footer_css,
            ],
        ]);
    }

    /**
     * Save customization for a specific section
     */
    public function saveSection(Request $request, Theme $theme, string $section)
    {
        // Validate section is allowed (settings, header, footer only)
        $validator = Validator::make(
            ['section' => $section],
            ['section' => [Rule::in(['settings', 'header', 'footer'])]]
        );

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid section. Only settings, header, and footer can be customized.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Authorize: user must own this theme
        $this->authorizeThemeAccess($theme);

        // Validate: cannot customize system themes
        if ($theme->is_system_theme) {
            return response()->json([
                'message' => 'System themes cannot be customized',
            ], 403);
        }

        // Validate request data
        $data = $request->validate([
            'css' => 'nullable|string',
            'puck_data' => 'nullable|array',
            'theme_data' => 'nullable|array', // For settings section only
        ]);

        // Save CSS to database column
        $columnName = "{$section}_css";
        $theme->$columnName = $data['css'] ?? null;

        // Save puck_data or theme_data depending on section
        if ($section === 'settings') {
            // Settings: update theme_data in themes table
            if (isset($data['theme_data'])) {
                $theme->theme_data = array_merge($theme->theme_data ?? [], $data['theme_data']);
            }
        } else {
            // Header/Footer: update puck_data in theme_parts table
            if (isset($data['puck_data'])) {
                $themePart = ThemePart::where('theme_id', $theme->id)
                    ->where('type', $section)
                    ->first();

                if ($themePart) {
                    $themePart->puck_data_raw = $data['puck_data'];
                    $themePart->save();
                }
            }
        }

        $theme->save();

        return response()->json([
            'message' => ucfirst($section) . ' customization saved successfully',
            'data' => [
                'theme' => $theme,
            ],
        ]);
    }

    /**
     * Authorize theme access based on tenant context
     */
    protected function authorizeThemeAccess(Theme $theme): void
    {
        $tenantId = $this->getTenantId();

        // Check if theme belongs to the current tenant/central
        if ($theme->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized to customize this theme');
        }
    }

    /**
     * Get tenant ID based on context (central vs tenant)
     */
    protected function getTenantId(): ?string
    {
        // For central context (superadmin routes), return null
        if (request()->is('api/superadmin/*')) {
            return null;
        }

        // For tenant context, return current tenant ID
        return tenant()?->id;
    }
}
