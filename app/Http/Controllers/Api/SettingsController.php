<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Settings\TenantSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    /**
     * Display tenant settings.
     */
    public function index()
    {
        try {
            $settings = app(TenantSettings::class);

            return response()->json([
                'data' => [
                    'site_title' => $settings->site_title,
                    'site_description' => $settings->site_description,
                    'logo_url' => $settings->logo_url,
                    'favicon_url' => $settings->favicon_url,
                    'maintenance_mode' => $settings->maintenance_mode,
                    'social_links' => $settings->social_links,
                    'seo_meta' => $settings->seo_meta,
                    // Phase 9.6 — Analytics integrations
                    'ga4_measurement_id' => $settings->ga4_measurement_id,
                    'gtm_container_id' => $settings->gtm_container_id,
                    'clarity_project_id' => $settings->clarity_project_id,
                    'plausible_domain' => $settings->plausible_domain,
                    'meta_pixel_id' => $settings->meta_pixel_id,
                    // Phase 13 — Cookie consent controls
                    'privacy_policy_url' => $settings->privacy_policy_url,
                    'cookie_policy_url' => $settings->cookie_policy_url,
                    'ga4_enabled' => $settings->ga4_enabled,
                    'gtm_enabled' => $settings->gtm_enabled,
                    'clarity_enabled' => $settings->clarity_enabled,
                    'plausible_enabled' => $settings->plausible_enabled,
                    'meta_pixel_enabled' => $settings->meta_pixel_enabled,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to load tenant settings', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Settings not found for this tenant',
            ], 404);
        }
    }

    /**
     * Update tenant settings.
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'site_title' => 'sometimes|string|max:255',
            'site_description' => 'nullable|string',
            'logo_url' => 'nullable|url',
            'favicon_url' => 'nullable|url',
            'maintenance_mode' => 'sometimes|boolean',
            'social_links' => 'sometimes|array|max:20',
            'social_links.*' => 'string|max:500',
            'seo_meta' => 'sometimes|array|max:20',
            'seo_meta.*' => 'nullable|string|max:500',
            // Phase 9.6 — Analytics integrations (strict format to prevent script injection)
            'ga4_measurement_id' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-\.]+$/'],
            'gtm_container_id' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-\.]+$/'],
            'clarity_project_id' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-\.]+$/'],
            'plausible_domain' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9\.\-]+$/'],
            'meta_pixel_id' => ['nullable', 'string', 'max:50', 'regex:/^[0-9]+$/'],
            // Phase 13 — Cookie consent controls
            'privacy_policy_url' => ['nullable', 'url', 'max:500'],
            'cookie_policy_url' => ['nullable', 'url', 'max:500'],
            'ga4_enabled' => ['sometimes', 'boolean'],
            'gtm_enabled' => ['sometimes', 'boolean'],
            'clarity_enabled' => ['sometimes', 'boolean'],
            'plausible_enabled' => ['sometimes', 'boolean'],
            'meta_pixel_enabled' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Evaluate final state (incoming values override existing settings)
        $settings = app(TenantSettings::class);

        $ga4Enabled = $request->has('ga4_enabled') ? (bool) $request->ga4_enabled : (bool) $settings->ga4_enabled;
        $gtmEnabled = $request->has('gtm_enabled') ? (bool) $request->gtm_enabled : (bool) $settings->gtm_enabled;
        $clarityEnabled = $request->has('clarity_enabled') ? (bool) $request->clarity_enabled : (bool) $settings->clarity_enabled;
        $plausibleEnabled = $request->has('plausible_enabled') ? (bool) $request->plausible_enabled : (bool) $settings->plausible_enabled;
        $metaPixelEnabled = $request->has('meta_pixel_enabled') ? (bool) $request->meta_pixel_enabled : (bool) $settings->meta_pixel_enabled;

        $ga4Id = $request->has('ga4_measurement_id') ? $request->ga4_measurement_id : $settings->ga4_measurement_id;
        $gtmId = $request->has('gtm_container_id') ? $request->gtm_container_id : $settings->gtm_container_id;
        $clarityId = $request->has('clarity_project_id') ? $request->clarity_project_id : $settings->clarity_project_id;
        $plausibleDomain = $request->has('plausible_domain') ? $request->plausible_domain : $settings->plausible_domain;
        $metaPixelId = $request->has('meta_pixel_id') ? $request->meta_pixel_id : $settings->meta_pixel_id;
        $cookiePolicyUrl = $request->has('cookie_policy_url') ? $request->cookie_policy_url : $settings->cookie_policy_url;

        $crossFieldErrors = [];

        if ($ga4Enabled && empty($ga4Id)) {
            $crossFieldErrors['ga4_measurement_id'][] = 'ga4_measurement_id is required when ga4_enabled is true.';
        }
        if ($gtmEnabled && empty($gtmId)) {
            $crossFieldErrors['gtm_container_id'][] = 'gtm_container_id is required when gtm_enabled is true.';
        }
        if ($clarityEnabled && empty($clarityId)) {
            $crossFieldErrors['clarity_project_id'][] = 'clarity_project_id is required when clarity_enabled is true.';
        }
        if ($plausibleEnabled && empty($plausibleDomain)) {
            $crossFieldErrors['plausible_domain'][] = 'plausible_domain is required when plausible_enabled is true.';
        }
        if ($metaPixelEnabled && empty($metaPixelId)) {
            $crossFieldErrors['meta_pixel_id'][] = 'meta_pixel_id is required when meta_pixel_enabled is true.';
        }

        if (($ga4Enabled || $gtmEnabled || $clarityEnabled || $plausibleEnabled || $metaPixelEnabled) && empty($cookiePolicyUrl)) {
            $crossFieldErrors['cookie_policy_url'][] = 'cookie_policy_url is required when any optional provider is enabled.';
        }

        if (! empty($crossFieldErrors)) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $crossFieldErrors,
            ], 422);
        }

        try {
            $changedFields = [];

            if ($request->has('site_title')) {
                $changedFields['site_title'] = ['old' => $settings->site_title, 'new' => $request->site_title];
                $settings->site_title = $request->site_title;
            }
            if ($request->has('site_description')) {
                $changedFields['site_description'] = ['old' => $settings->site_description, 'new' => $request->site_description];
                $settings->site_description = $request->site_description;
            }
            if ($request->has('logo_url')) {
                $changedFields['logo_url'] = ['old' => $settings->logo_url, 'new' => $request->logo_url];
                $settings->logo_url = $request->logo_url;
            }
            if ($request->has('favicon_url')) {
                $changedFields['favicon_url'] = ['old' => $settings->favicon_url, 'new' => $request->favicon_url];
                $settings->favicon_url = $request->favicon_url;
            }
            if ($request->has('maintenance_mode')) {
                $changedFields['maintenance_mode'] = ['old' => $settings->maintenance_mode, 'new' => $request->maintenance_mode];
                $settings->maintenance_mode = $request->maintenance_mode;
            }
            if ($request->has('social_links')) {
                $changedFields['social_links'] = ['old' => $settings->social_links, 'new' => $request->social_links];
                $settings->social_links = $request->social_links;
            }
            if ($request->has('seo_meta')) {
                $changedFields['seo_meta'] = ['old' => $settings->seo_meta, 'new' => $request->seo_meta];
                $settings->seo_meta = $request->seo_meta;
            }
            // Phase 9.6 — Analytics integrations
            if ($request->has('ga4_measurement_id')) {
                $changedFields['ga4_measurement_id'] = ['old' => $settings->ga4_measurement_id, 'new' => $request->ga4_measurement_id];
                $settings->ga4_measurement_id = $request->ga4_measurement_id;
            }
            if ($request->has('gtm_container_id')) {
                $changedFields['gtm_container_id'] = ['old' => $settings->gtm_container_id, 'new' => $request->gtm_container_id];
                $settings->gtm_container_id = $request->gtm_container_id;
            }
            if ($request->has('clarity_project_id')) {
                $changedFields['clarity_project_id'] = ['old' => $settings->clarity_project_id, 'new' => $request->clarity_project_id];
                $settings->clarity_project_id = $request->clarity_project_id;
            }
            if ($request->has('plausible_domain')) {
                $changedFields['plausible_domain'] = ['old' => $settings->plausible_domain, 'new' => $request->plausible_domain];
                $settings->plausible_domain = $request->plausible_domain;
            }
            if ($request->has('meta_pixel_id')) {
                $changedFields['meta_pixel_id'] = ['old' => $settings->meta_pixel_id, 'new' => $request->meta_pixel_id];
                $settings->meta_pixel_id = $request->meta_pixel_id;
            }
            // Phase 13 — Cookie consent controls
            if ($request->has('privacy_policy_url')) {
                $changedFields['privacy_policy_url'] = ['old' => $settings->privacy_policy_url, 'new' => $request->privacy_policy_url];
                $settings->privacy_policy_url = $request->privacy_policy_url;
            }
            if ($request->has('cookie_policy_url')) {
                $changedFields['cookie_policy_url'] = ['old' => $settings->cookie_policy_url, 'new' => $request->cookie_policy_url];
                $settings->cookie_policy_url = $request->cookie_policy_url;
            }
            if ($request->has('ga4_enabled')) {
                $changedFields['ga4_enabled'] = ['old' => $settings->ga4_enabled, 'new' => $request->ga4_enabled];
                $settings->ga4_enabled = $request->boolean('ga4_enabled');
            }
            if ($request->has('gtm_enabled')) {
                $changedFields['gtm_enabled'] = ['old' => $settings->gtm_enabled, 'new' => $request->gtm_enabled];
                $settings->gtm_enabled = $request->boolean('gtm_enabled');
            }
            if ($request->has('clarity_enabled')) {
                $changedFields['clarity_enabled'] = ['old' => $settings->clarity_enabled, 'new' => $request->clarity_enabled];
                $settings->clarity_enabled = $request->boolean('clarity_enabled');
            }
            if ($request->has('plausible_enabled')) {
                $changedFields['plausible_enabled'] = ['old' => $settings->plausible_enabled, 'new' => $request->plausible_enabled];
                $settings->plausible_enabled = $request->boolean('plausible_enabled');
            }
            if ($request->has('meta_pixel_enabled')) {
                $changedFields['meta_pixel_enabled'] = ['old' => $settings->meta_pixel_enabled, 'new' => $request->meta_pixel_enabled];
                $settings->meta_pixel_enabled = $request->boolean('meta_pixel_enabled');
            }

            $settings->save();

            if (!empty($changedFields)) {
                activity()
                    ->causedBy($request->user())
                    ->withProperties([
                        'changed_fields' => $changedFields,
                    ])
                    ->log('Updated tenant settings');
            }

            return response()->json([
                'message' => 'Settings updated successfully',
                'data' => [
                    'site_title' => $settings->site_title,
                    'site_description' => $settings->site_description,
                    'logo_url' => $settings->logo_url,
                    'favicon_url' => $settings->favicon_url,
                    'maintenance_mode' => $settings->maintenance_mode,
                    'social_links' => $settings->social_links,
                    'seo_meta' => $settings->seo_meta,
                    // Phase 9.6 — Analytics integrations
                    'ga4_measurement_id' => $settings->ga4_measurement_id,
                    'gtm_container_id' => $settings->gtm_container_id,
                    'clarity_project_id' => $settings->clarity_project_id,
                    'plausible_domain' => $settings->plausible_domain,
                    'meta_pixel_id' => $settings->meta_pixel_id,
                    // Phase 13 — Cookie consent controls
                    'privacy_policy_url' => $settings->privacy_policy_url,
                    'cookie_policy_url' => $settings->cookie_policy_url,
                    'ga4_enabled' => $settings->ga4_enabled,
                    'gtm_enabled' => $settings->gtm_enabled,
                    'clarity_enabled' => $settings->clarity_enabled,
                    'plausible_enabled' => $settings->plausible_enabled,
                    'meta_pixel_enabled' => $settings->meta_pixel_enabled,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update tenant settings', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to update settings',
            ], 500);
        }
    }
}
