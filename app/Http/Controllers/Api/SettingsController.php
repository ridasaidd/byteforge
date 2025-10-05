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
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Settings not found for this tenant',
                'error' => $e->getMessage()
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
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $settings = app(TenantSettings::class);

            if ($request->has('site_title')) {
                $settings->site_title = $request->site_title;
            }
            if ($request->has('site_description')) {
                $settings->site_description = $request->site_description;
            }
            if ($request->has('logo_url')) {
                $settings->logo_url = $request->logo_url;
            }
            if ($request->has('favicon_url')) {
                $settings->favicon_url = $request->favicon_url;
            }
            if ($request->has('maintenance_mode')) {
                $settings->maintenance_mode = $request->maintenance_mode;
            }
            if ($request->has('social_links')) {
                $settings->social_links = $request->social_links;
            }
            if ($request->has('seo_meta')) {
                $settings->seo_meta = $request->seo_meta;
            }

            $settings->save();

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
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
