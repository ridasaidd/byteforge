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

    public function getCustomization(Theme $theme)
    {
        // Get current tenant context
        $tenantId = $this->getTenantId();

        // Load header/footer content from theme_parts for this tenant/central scope
        $headerPart = ThemePart::where('theme_id', $theme->id)
            ->where('tenant_id', $tenantId)
            ->where('type', 'header')
            ->first();

        $footerPart = ThemePart::where('theme_id', $theme->id)
            ->where('tenant_id', $tenantId)
            ->where('type', 'footer')
            ->first();

        // Load customized settings (theme_data override) from theme_parts
        $settingsPart = ThemePart::where('theme_id', $theme->id)
            ->where('tenant_id', $tenantId)
            ->where('type', 'settings')
            ->first();

        // Merge blueprint theme_data with customized overrides
        $customizedThemeData = $theme->theme_data;
        if ($settingsPart && $settingsPart->puck_data_raw) {
            $customizedThemeData = array_replace_recursive(
                $theme->theme_data ?? [],
                $settingsPart->puck_data_raw
            );
        }

        return response()->json([
            'data' => [
                'theme_data' => $customizedThemeData,
                'settings_css' => $settingsPart->settings_css ?? null,
                'header_css' => $headerPart->settings_css ?? null,
                'footer_css' => $footerPart->settings_css ?? null,
                'header_data' => $headerPart?->puck_data_raw,
                'footer_data' => $footerPart?->puck_data_raw,
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

        // Get current tenant context
        $tenantId = $this->getTenantId();

        // Validate: theme_parts must exist for this theme + tenant scope
        // (created when theme is activated)
        $hasThemeParts = ThemePart::where('theme_id', $theme->id)
            ->where('tenant_id', $tenantId)
            ->exists();

        if (!$hasThemeParts) {
            return response()->json([
                'message' => 'Please activate this theme first to customize it.',
            ], 403);
        }

        // Validate request data
        $data = $request->validate([
            'css' => 'nullable|string',
            'theme_data' => 'nullable|array', // For settings section
            'puck_data' => 'nullable|array', // For header/footer sections
        ]);

        // All customizations are stored in theme_parts (scoped by tenant)
        // This keeps the blueprint (Theme) immutable
        
        if ($section === 'settings') {
            // Settings: store theme_data override and CSS in theme_parts
            $settingsPart = ThemePart::firstOrCreate(
                [
                    'theme_id' => $theme->id,
                    'tenant_id' => $tenantId,
                    'type' => 'settings',
                ],
                [
                    'name' => $theme->name . ' Settings',
                    'slug' => $theme->slug . '-settings-' . ($tenantId ?? 'central'),
                    'status' => 'published',
                    'created_by' => $request->user()->id,
                ]
            );

            if (isset($data['theme_data'])) {
                $settingsPart->puck_data_raw = $data['theme_data'];
            }
            if (isset($data['css'])) {
                $settingsPart->settings_css = $data['css'];
            }
            $settingsPart->save();
        }

        // Header/Footer sections: update theme_part content (puck_data) and CSS
        if (in_array($section, ['header', 'footer'])) {
            $themePart = ThemePart::where('theme_id', $theme->id)
                ->where('tenant_id', $tenantId)
                ->where('type', $section)
                ->first();

            if ($themePart) {
                if (isset($data['puck_data'])) {
                    $themePart->puck_data_raw = $data['puck_data'];
                }
                if (isset($data['css'])) {
                    $themePart->settings_css = $data['css'];
                }
                $themePart->save();
            }
        }

        return response()->json([
            'message' => ucfirst($section) . ' customization saved successfully',
            'data' => [
                'theme' => $theme,
            ],
        ]);
    }

    /**
     * Get tenant ID based on context (central vs tenant)
     */
    protected function getTenantId(): ?string
    {
        // For tenant context, return current tenant ID
        // For central context, tenant() returns null
        return tenant()?->id;
    }
}
