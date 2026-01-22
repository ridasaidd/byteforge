<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SuperadminController;
use Illuminate\Support\Facades\Route;

// Central API routes - available on central domains
foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {

        // Authentication routes
        Route::prefix('auth')->group(function () {
            Route::post('login', [AuthController::class, 'login']);
            Route::post('register', [AuthController::class, 'register']);
            Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
            Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
            Route::get('user', [AuthController::class, 'user'])->middleware('auth:api');
            Route::put('user', [AuthController::class, 'updateProfile'])->middleware('auth:api');
            Route::put('password', [AuthController::class, 'updatePassword'])->middleware('auth:api');
            Route::post('avatar', [AuthController::class, 'uploadAvatar'])->middleware('auth:api');
            Route::delete('avatar', [AuthController::class, 'deleteAvatar'])->middleware('auth:api');
        });

        // Superadmin routes - require superadmin role
        Route::prefix('superadmin')->middleware(['auth:api'])->group(function () {
            // Dashboard stats (aggregated, cached)
            Route::get('dashboard/stats', [\App\Http\Controllers\Api\StatsController::class, 'getDashboardStats'])->middleware('permission:view dashboard stats');
            Route::post('dashboard/stats/refresh', [\App\Http\Controllers\Api\StatsController::class, 'refresh'])->middleware('permission:view dashboard stats');

            // Tenants management
            Route::get('tenants', [SuperadminController::class, 'indexTenants'])->middleware('permission:view tenants');
            Route::post('tenants', [SuperadminController::class, 'storeTenant'])->middleware('permission:manage tenants');
            Route::get('tenants/{tenant}', [SuperadminController::class, 'showTenant'])->middleware('permission:view tenants');
            Route::put('tenants/{tenant}', [SuperadminController::class, 'updateTenant'])->middleware('permission:manage tenants');
            Route::delete('tenants/{tenant}', [SuperadminController::class, 'destroyTenant'])->middleware('permission:manage tenants');

            // Users management
            Route::get('users', [SuperadminController::class, 'indexUsers'])->middleware('permission:view users');
            Route::post('users', [SuperadminController::class, 'storeUser'])->middleware('permission:manage users');
            Route::get('users/{user}', [SuperadminController::class, 'showUser'])->middleware('permission:view users');
            Route::put('users/{user}', [SuperadminController::class, 'updateUser'])->middleware('permission:manage users');
            Route::delete('users/{user}', [SuperadminController::class, 'destroyUser'])->middleware('permission:manage users');

            // Pages management (for central public site)
            Route::apiResource('pages', \App\Http\Controllers\Api\PageController::class)
                ->middleware('permission:pages.view|pages.create|pages.edit|pages.delete');

            // Navigation management (for central public site)
            Route::apiResource('navigations', \App\Http\Controllers\Api\NavigationController::class)
                ->middleware('permission:navigation.view|navigation.create|navigation.edit|navigation.delete');

            // Theme parts and layouts management
            Route::apiResource('theme-parts', \App\Http\Controllers\Api\ThemePartController::class)
                ->middleware('permission:themes.manage|themes.view');
            Route::apiResource('page-templates', \App\Http\Controllers\Api\PageTemplateController::class)
                ->middleware('permission:templates.view|templates.manage');
            Route::apiResource('layouts', \App\Http\Controllers\Api\LayoutController::class)
                ->middleware('permission:layouts.view|layouts.manage');

            // Themes management
            Route::get('themes/available', [\App\Http\Controllers\Api\ThemeController::class, 'available'])
                ->middleware('permission:themes.view');
            Route::get('themes/active', [\App\Http\Controllers\Api\ThemeController::class, 'active'])
                ->middleware('permission:themes.view');
            Route::get('themes/active/templates', [\App\Http\Controllers\Api\ThemeController::class, 'activeTemplates'])
                ->middleware('permission:themes.view');
            Route::get('themes/{slug}/templates', [\App\Http\Controllers\Api\ThemeController::class, 'templates'])
                ->middleware('permission:themes.view');
            Route::post('themes/activate', [\App\Http\Controllers\Api\ThemeController::class, 'activate'])
                ->middleware('permission:themes.activate|themes.manage');
            Route::post('themes/{theme}/reset', [\App\Http\Controllers\Api\ThemeController::class, 'reset'])
                ->middleware('permission:themes.manage');
            Route::post('themes/{theme}/duplicate', [\App\Http\Controllers\Api\ThemeController::class, 'duplicate'])
                ->middleware('permission:themes.manage');
            Route::get('themes/{theme}/export', [\App\Http\Controllers\Api\ThemeController::class, 'export'])
                ->middleware('permission:themes.view');
            // Route for syncing themes from disk (restricted by permission)

            // Route for importing themes (commented out)
            // Route::post('themes/import', [\App\Http\Controllers\Api\ThemeController::class, 'import']);
            Route::apiResource('themes', \App\Http\Controllers\Api\ThemeController::class)
                ->middleware('permission:themes.manage|themes.view');

            // Activity logs (central)
            Route::get('activity-logs', [SuperadminController::class, 'indexActivity'])->middleware('permission:view activity logs');

            // Settings management
            Route::get('settings', [SuperadminController::class, 'getSettings'])->middleware('permission:view settings');
            Route::put('settings', [SuperadminController::class, 'updateSettings'])->middleware('permission:manage settings');

            // Tenant-User relationships
            Route::post('tenants/{tenant}/users', [SuperadminController::class, 'addUserToTenant'])->middleware('permission:manage tenants');
            Route::delete('tenants/{tenant}/users/{user}', [SuperadminController::class, 'removeUserFromTenant'])->middleware('permission:manage tenants');

            // Roles management
            Route::get('roles', [\App\Http\Controllers\Api\RoleController::class, 'index'])->middleware('permission:view users|manage users|manage roles');
            Route::post('roles', [\App\Http\Controllers\Api\RoleController::class, 'store'])->middleware('permission:manage roles');
            Route::get('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'show'])->middleware('permission:manage roles');
            Route::put('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'update'])->middleware('permission:manage roles');
            Route::delete('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'destroy'])->middleware('permission:manage roles');

            // Permissions management
            Route::apiResource('permissions', \App\Http\Controllers\Api\PermissionController::class)->middleware('permission:manage roles');

            // Assign permissions to a role
            Route::post('roles/{role}/permissions', [\App\Http\Controllers\Api\RoleAssignmentController::class, 'assignPermissions'])->middleware('permission:manage roles');

            // Assign roles to a user
            Route::post('users/{user}/roles', [\App\Http\Controllers\Api\RoleAssignmentController::class, 'assignRoles'])->middleware('permission:manage users');
        });

        // Media Management (Central) - using central storage, not tenant-scoped
        Route::middleware(['auth:api'])->prefix('superadmin')->group(function () {
            Route::get('media', [\App\Http\Controllers\Api\MediaController::class, 'index'])
                ->middleware('permission:media.view|media.manage');
            Route::post('media', [\App\Http\Controllers\Api\MediaController::class, 'store'])
                ->middleware('permission:media.manage');
            Route::get('media/{media}', [\App\Http\Controllers\Api\MediaController::class, 'show'])
                ->middleware('permission:media.view|media.manage');
            Route::delete('media/{media}', [\App\Http\Controllers\Api\MediaController::class, 'destroy'])
                ->middleware('permission:media.manage');

            Route::apiResource('media-folders', \App\Http\Controllers\Api\Tenant\MediaFolderController::class)
                ->middleware('permission:media.manage');
            Route::get('media-folders-tree', [\App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'tree'])
                ->middleware('permission:media.view|media.manage');
        });

        // Public routes
        Route::get('health', function () {
            return response()->json(['status' => 'ok']);
        });

        // Public theme endpoint (no auth required)
        Route::get('themes/public', [\App\Http\Controllers\Api\ThemeController::class, 'publicTheme']);

        // Public page endpoints (no auth required)
        Route::get('pages/public/homepage', [\App\Http\Controllers\Api\PageController::class, 'getHomepage']);
        Route::get('pages/public/{slug}', [\App\Http\Controllers\Api\PageController::class, 'getBySlug']);

    });
}
