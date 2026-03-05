<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Settings\TenantSettings;
use Illuminate\Http\Request;
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
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Settings not found for this tenant',
                'error' => $e->getMessage(),
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
            'social_links' => 'sometimes|array',
            'seo_meta' => 'sometimes|array',
            // Phase 9.6 — Analytics integrations
            'ga4_measurement_id' => 'nullable|string|max:255',
            'gtm_container_id' => 'nullable|string|max:255',
            'clarity_project_id' => 'nullable|string|max:255',
            'plausible_domain' => 'nullable|string|max:255',
            'meta_pixel_id' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $settings = app(TenantSettings::class);

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
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update settings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
