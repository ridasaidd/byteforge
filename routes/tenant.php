<?php

declare(strict_types=1);

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\LayoutController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\NavigationController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\Tenant\MediaFolderController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\ThemePartController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Here you can register the tenant routes for your application.
| These routes are loaded by the TenantRouteServiceProvider.
|
| Feel free to customize them however you want. Good luck!
|
*/

Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    // Public storefront — serve tenant SPA with theme + analytics scripts injected
    Route::get('/', function () {
        try {
            $analyticsSettings = app(\App\Settings\TenantSettings::class);
        } catch (\Throwable $e) {
            $analyticsSettings = null;
        }
        try {
            $activeTheme = app(\App\Services\ThemeService::class)->getActiveTheme(tenant('id'));
        } catch (\Throwable $e) {
            $activeTheme = null;
        }
        return view('public-tenant', compact('analyticsSettings', 'activeTheme'));
    });

    Route::get('/pages/{slug}', function (string $slug) {
        try {
            $analyticsSettings = app(\App\Settings\TenantSettings::class);
        } catch (\Throwable $e) {
            $analyticsSettings = null;
        }
        try {
            $activeTheme = app(\App\Services\ThemeService::class)->getActiveTheme(tenant('id'));
        } catch (\Throwable $e) {
            $activeTheme = null;
        }
        return view('public-tenant', compact('analyticsSettings', 'activeTheme'));
    })->where('slug', '[a-z0-9\-]+');
});

// Tenant API routes
Route::middleware([
    'api',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->prefix('api')->group(function () {

    // Public tenant routes
    Route::get('info', [TenantController::class, 'info']);

    // Public pages CSS endpoint (for tenant storefront)
    Route::get('pages/css/merged', [\App\Http\Controllers\Api\PageCssController::class, 'getMergedCss']);

    // Public storefront page endpoints (Phase 9.6 — mirrors central api.php for tenant domain)
    Route::get('themes/public', [\App\Http\Controllers\Api\ThemeController::class, 'publicTheme']);
    Route::get('pages/public/homepage', [\App\Http\Controllers\Api\PageController::class, 'getHomepage']);
    Route::get('pages/public/{slug}', [\App\Http\Controllers\Api\PageController::class, 'getBySlug']);

    // Protected tenant routes - require authentication
    Route::middleware('auth:api')->group(function () {
        Route::get('dashboard', [TenantController::class, 'dashboard']);

        // Resource routes
        Route::apiResource('pages', PageController::class)
            ->middleware('permission:pages.view|pages.create|pages.edit|pages.delete');

        Route::apiResource('navigations', NavigationController::class)
            ->middleware('permission:navigation.view|navigation.create|navigation.edit|navigation.delete');
        Route::apiResource('theme-parts', ThemePartController::class)
            ->middleware('permission:themes.view|themes.manage');
        Route::apiResource('layouts', LayoutController::class)
            ->middleware('permission:layouts.view|layouts.manage');

        // Theme Customization (Phase 6) - Tenant
        Route::get('themes/active', [\App\Http\Controllers\Api\ThemeController::class, 'active'])
            ->middleware('permission:themes.view');
        Route::get('themes/active/templates', [\App\Http\Controllers\Api\ThemeController::class, 'activeTemplates'])
            ->middleware('permission:themes.view');
        Route::get('themes/{theme}/customization', [\App\Http\Controllers\Api\ThemeCustomizationController::class, 'getCustomization'])
            ->middleware('permission:themes.view');
        Route::post('themes/{theme}/customization/{section}', [\App\Http\Controllers\Api\ThemeCustomizationController::class, 'saveSection'])
            ->middleware('permission:themes.manage');

        Route::apiResource('users', UserController::class)->except(['store', 'update', 'destroy'])
            ->middleware('permission:view users');

        // Media management
        Route::apiResource('media', MediaController::class)->except(['update'])
            ->middleware('permission:media.view|media.manage');
        Route::apiResource('media-folders', MediaFolderController::class)
            ->middleware('permission:media.manage');
        Route::get('media-folders-tree', [MediaFolderController::class, 'tree'])
            ->middleware('permission:media.view|media.manage');

        // User role management
        Route::post('users/{user}/roles', [UserController::class, 'assignRole'])->middleware('permission:manage users');
        Route::delete('users/{user}/roles/{role}', [UserController::class, 'removeRole'])->middleware('permission:manage users');

        // Settings management
        Route::get('settings', [SettingsController::class, 'index'])->middleware('permission:view settings');
        Route::put('settings', [SettingsController::class, 'update'])->middleware('permission:manage settings');

        // Activity logs
        Route::get('activity-logs', [ActivityLogController::class, 'index'])->middleware('permission:view activity logs');
        Route::get('activity-logs/{id}', [ActivityLogController::class, 'show'])->middleware('permission:view activity logs');

        // Analytics (tenant-scoped events only)
        Route::prefix('analytics')->group(function () {
            Route::get('overview',  [AnalyticsController::class, 'overview'])->middleware('permission:view analytics');
            Route::get('pages',     [AnalyticsController::class, 'pages'])->middleware('permission:view analytics');
            Route::get('bookings',  [AnalyticsController::class, 'bookings'])->middleware('permission:view analytics');  // empty until Phase 11
            Route::get('revenue',   [AnalyticsController::class, 'revenue'])->middleware('permission:view analytics');   // empty until Phase 10
        });
    });
});
