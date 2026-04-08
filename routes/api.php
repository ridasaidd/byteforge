<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\PlatformAnalyticsController;
use App\Http\Controllers\Api\SuperadminController;
use App\Http\Controllers\Api\ThemeCssController;
use Illuminate\Support\Facades\Route;

// Central API routes - available on central domains
foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {

        // Authentication routes
        Route::prefix('auth')->group(function () {
            Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
            // Registration is disabled on the central admin surface.
            // Re-enable only when invite/verification flow is in place.
            // Route::post('register', [AuthController::class, 'register']);
            Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
            Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
            Route::get('user', [AuthController::class, 'user'])->middleware('auth:api');
            Route::put('user', [AuthController::class, 'updateProfile'])->middleware('auth:api');
            Route::put('password', [AuthController::class, 'updatePassword'])->middleware('auth:api');
            Route::patch('locale', [AuthController::class, 'updateLocale'])->middleware('auth:api');
            Route::post('avatar', [AuthController::class, 'uploadAvatar'])->middleware('auth:api');
            Route::delete('avatar', [AuthController::class, 'deleteAvatar'])->middleware('auth:api');
        });

        // Theme Customization - Central (dogfooding - central uses same theme system as tenants)
        Route::middleware(['auth:api'])->group(function () {
            Route::get('themes/{theme}/customization', [\App\Http\Controllers\Api\ThemeCustomizationController::class, 'getCustomization'])
                ->middleware('permission:themes.view');
            Route::post('themes/{theme}/customization/{section}', [\App\Http\Controllers\Api\ThemeCustomizationController::class, 'saveSection'])
                ->middleware('permission:themes.manage');
        });

        // Superadmin routes - require superadmin role
        Route::prefix('superadmin')->middleware(['auth:api'])->group(function () {
            // Dashboard stats (aggregated, cached)
            Route::get('dashboard/stats', [\App\Http\Controllers\Api\StatsController::class, 'getDashboardStats'])->middleware('permission:analytics.dashboard');
            Route::post('dashboard/stats/refresh', [\App\Http\Controllers\Api\StatsController::class, 'refresh'])->middleware('permission:analytics.dashboard');

            // Tenants management
            Route::get('tenants', [SuperadminController::class, 'indexTenants'])->middleware('permission:tenants.view');
            Route::post('tenants', [SuperadminController::class, 'storeTenant'])->middleware('permission:tenants.manage');
            Route::get('tenants/{tenant}', [SuperadminController::class, 'showTenant'])->middleware('permission:tenants.view');
            Route::put('tenants/{tenant}', [SuperadminController::class, 'updateTenant'])->middleware('permission:tenants.manage');
            Route::delete('tenants/{tenant}', [SuperadminController::class, 'destroyTenant'])->middleware('permission:tenants.manage');

            // Users management
            Route::get('users', [SuperadminController::class, 'indexUsers'])->middleware('permission:users.view');
            Route::post('users', [SuperadminController::class, 'storeUser'])->middleware('permission:users.manage');
            Route::get('users/{user}', [SuperadminController::class, 'showUser'])->middleware('permission:users.view');
            Route::put('users/{user}', [SuperadminController::class, 'updateUser'])->middleware('permission:users.manage');
            Route::delete('users/{user}', [SuperadminController::class, 'destroyUser'])->middleware('permission:users.manage');

            // Pages management (for central public site) — per-action permission checks
            Route::get('pages', [\App\Http\Controllers\Api\PageController::class, 'index'])->middleware('permission:pages.view');
            Route::post('pages', [\App\Http\Controllers\Api\PageController::class, 'store'])->middleware('permission:pages.create');
            Route::get('pages/{page}', [\App\Http\Controllers\Api\PageController::class, 'show'])->middleware('permission:pages.view');
            Route::put('pages/{page}', [\App\Http\Controllers\Api\PageController::class, 'update'])->middleware('permission:pages.edit');
            Route::patch('pages/{page}', [\App\Http\Controllers\Api\PageController::class, 'update'])->middleware('permission:pages.edit');
            Route::delete('pages/{page}', [\App\Http\Controllers\Api\PageController::class, 'destroy'])->middleware('permission:pages.delete');

            // Navigation management (for central public site) — per-action permission checks
            Route::get('navigations', [\App\Http\Controllers\Api\NavigationController::class, 'index'])->middleware('permission:navigation.view');
            Route::post('navigations', [\App\Http\Controllers\Api\NavigationController::class, 'store'])->middleware('permission:navigation.create');
            Route::get('navigations/{navigation}', [\App\Http\Controllers\Api\NavigationController::class, 'show'])->middleware('permission:navigation.view');
            Route::put('navigations/{navigation}', [\App\Http\Controllers\Api\NavigationController::class, 'update'])->middleware('permission:navigation.edit');
            Route::patch('navigations/{navigation}', [\App\Http\Controllers\Api\NavigationController::class, 'update'])->middleware('permission:navigation.edit');
            Route::delete('navigations/{navigation}', [\App\Http\Controllers\Api\NavigationController::class, 'destroy'])->middleware('permission:navigation.delete');

            // Theme parts management — per-action permission checks
            Route::get('theme-parts', [\App\Http\Controllers\Api\ThemePartController::class, 'index'])->middleware('permission:themes.view');
            Route::post('theme-parts', [\App\Http\Controllers\Api\ThemePartController::class, 'store'])->middleware('permission:themes.manage');
            Route::get('theme-parts/{theme_part}', [\App\Http\Controllers\Api\ThemePartController::class, 'show'])->middleware('permission:themes.view');
            Route::put('theme-parts/{theme_part}', [\App\Http\Controllers\Api\ThemePartController::class, 'update'])->middleware('permission:themes.manage');
            Route::patch('theme-parts/{theme_part}', [\App\Http\Controllers\Api\ThemePartController::class, 'update'])->middleware('permission:themes.manage');
            Route::delete('theme-parts/{theme_part}', [\App\Http\Controllers\Api\ThemePartController::class, 'destroy'])->middleware('permission:themes.manage');
            // Page templates management — per-action permission checks
            Route::get('page-templates', [\App\Http\Controllers\Api\PageTemplateController::class, 'index'])->middleware('permission:templates.view');
            Route::post('page-templates', [\App\Http\Controllers\Api\PageTemplateController::class, 'store'])->middleware('permission:templates.manage');
            Route::get('page-templates/{page_template}', [\App\Http\Controllers\Api\PageTemplateController::class, 'show'])->middleware('permission:templates.view');
            Route::put('page-templates/{page_template}', [\App\Http\Controllers\Api\PageTemplateController::class, 'update'])->middleware('permission:templates.manage');
            Route::patch('page-templates/{page_template}', [\App\Http\Controllers\Api\PageTemplateController::class, 'update'])->middleware('permission:templates.manage');
            Route::delete('page-templates/{page_template}', [\App\Http\Controllers\Api\PageTemplateController::class, 'destroy'])->middleware('permission:templates.manage');
            // Layouts management — per-action permission checks
            Route::get('layouts', [\App\Http\Controllers\Api\LayoutController::class, 'index'])->middleware('permission:layouts.view');
            Route::post('layouts', [\App\Http\Controllers\Api\LayoutController::class, 'store'])->middleware('permission:layouts.manage');
            Route::get('layouts/{layout}', [\App\Http\Controllers\Api\LayoutController::class, 'show'])->middleware('permission:layouts.view');
            Route::put('layouts/{layout}', [\App\Http\Controllers\Api\LayoutController::class, 'update'])->middleware('permission:layouts.manage');
            Route::patch('layouts/{layout}', [\App\Http\Controllers\Api\LayoutController::class, 'update'])->middleware('permission:layouts.manage');
            Route::delete('layouts/{layout}', [\App\Http\Controllers\Api\LayoutController::class, 'destroy'])->middleware('permission:layouts.manage');

            // Themes management (available endpoint unused; commented to avoid stale frontend calls)
            // Route::get('themes/available', [\App\Http\Controllers\Api\ThemeController::class, 'available'])
            //     ->middleware('permission:themes.view');
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
            // Themes management — per-action permission checks
            Route::get('themes', [\App\Http\Controllers\Api\ThemeController::class, 'index'])->middleware('permission:themes.view');
            Route::post('themes', [\App\Http\Controllers\Api\ThemeController::class, 'store'])->middleware('permission:themes.manage');
            Route::get('themes/{theme}', [\App\Http\Controllers\Api\ThemeController::class, 'show'])->middleware('permission:themes.view');
            Route::put('themes/{theme}', [\App\Http\Controllers\Api\ThemeController::class, 'update'])->middleware('permission:themes.manage');
            Route::patch('themes/{theme}', [\App\Http\Controllers\Api\ThemeController::class, 'update'])->middleware('permission:themes.manage');
            Route::delete('themes/{theme}', [\App\Http\Controllers\Api\ThemeController::class, 'destroy'])->middleware('permission:themes.manage');

            // Theme CSS management (section saves, publish)
            Route::post('themes/{theme}/sections/{section}', [ThemeCssController::class, 'saveSection'])
                ->middleware('permission:themes.manage');
            Route::get('themes/{theme}/sections/{section}', [ThemeCssController::class, 'getSection'])
                ->middleware('permission:themes.view');
            Route::get('themes/{theme}/publish/validate', [ThemeCssController::class, 'validatePublish'])
                ->middleware('permission:themes.manage');
            Route::post('themes/{theme}/publish', [ThemeCssController::class, 'publish'])
                ->middleware('permission:themes.manage');

            // Theme Placeholder management (blueprint content: header, footer, sidebars, etc.)
            Route::get('themes/{theme}/placeholders', [\App\Http\Controllers\Api\ThemePlaceholderController::class, 'index'])
                ->middleware('permission:themes.view');
            Route::get('themes/{theme}/placeholders/{section}', [\App\Http\Controllers\Api\ThemePlaceholderController::class, 'show'])
                ->middleware('permission:themes.view');
            Route::post('themes/{theme}/placeholders/{section}', [\App\Http\Controllers\Api\ThemePlaceholderController::class, 'store'])
                ->middleware('permission:themes.manage');
            Route::delete('themes/{theme}/placeholders/{section}', [\App\Http\Controllers\Api\ThemePlaceholderController::class, 'destroy'])
                ->middleware('permission:themes.manage');

            // Activity logs (central)
            Route::get('activity-logs', [SuperadminController::class, 'indexActivity'])->middleware('permission:activity.view');

            // Analytics (platform-level and cross-tenant aggregates)
            Route::prefix('analytics')->group(function () {
                Route::get('overview', [PlatformAnalyticsController::class, 'overview'])
                    ->middleware('permission:analytics.platform');
                Route::get('tenants/overview', [PlatformAnalyticsController::class, 'tenantsOverview'])
                    ->middleware('permission:analytics.platform');
            });

            // Settings management
            Route::get('settings', [SuperadminController::class, 'getSettings'])->middleware('permission:settings.view');
            Route::put('settings', [SuperadminController::class, 'updateSettings'])->middleware('permission:settings.manage');

            // Tenant-User relationships
            Route::post('tenants/{tenant}/users', [SuperadminController::class, 'addUserToTenant'])->middleware('permission:tenants.manage');
            Route::delete('tenants/{tenant}/users/{user}', [SuperadminController::class, 'removeUserFromTenant'])->middleware('permission:tenants.manage');

            // Roles management
            Route::get('roles', [\App\Http\Controllers\Api\RoleController::class, 'index'])->middleware('permission:users.view|users.manage|roles.manage');
            Route::post('roles', [\App\Http\Controllers\Api\RoleController::class, 'store'])->middleware('permission:roles.manage');
            Route::get('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'show'])->middleware('permission:roles.manage');
            Route::put('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'update'])->middleware('permission:roles.manage');
            Route::delete('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'destroy'])->middleware('permission:roles.manage');

            // Permissions management
            Route::apiResource('permissions', \App\Http\Controllers\Api\PermissionController::class)->middleware('permission:roles.manage');

            // Assign permissions to a role
            Route::post('roles/{role}/permissions', [\App\Http\Controllers\Api\RoleAssignmentController::class, 'assignPermissions'])->middleware('permission:roles.manage');

            // Assign roles to a user
            Route::post('users/{user}/roles', [\App\Http\Controllers\Api\RoleAssignmentController::class, 'assignRoles'])->middleware('permission:users.manage');

            // Central billing (Phase 10.2)
            Route::prefix('billing')->group(function () {
                Route::get('plans', [BillingController::class, 'plans'])->middleware('permission:billing.view');
                Route::get('addons', [BillingController::class, 'addons'])->middleware('permission:billing.view');
                Route::get('subscription', [BillingController::class, 'subscription'])->middleware('permission:billing.view');
                Route::post('checkout', [BillingController::class, 'checkout'])->middleware('permission:billing.manage');
                Route::post('addons/{addon:slug}/activate', [BillingController::class, 'activateAddon'])->middleware('permission:billing.manage');
                Route::post('addons/{addon:slug}/deactivate', [BillingController::class, 'deactivateAddon'])->middleware('permission:billing.manage');
                Route::get('portal', [BillingController::class, 'portal'])->middleware('permission:billing.manage');
                Route::post('sync', [BillingController::class, 'syncSubscription'])->middleware('permission:billing.manage');
            });
        });

        // Media Management (Central) - using central storage, not tenant-scoped
        Route::middleware(['auth:api'])->prefix('superadmin')->group(function () {
            Route::get('media', [\App\Http\Controllers\Api\MediaController::class, 'index'])
                ->middleware('permission:media.view');
            Route::post('media', [\App\Http\Controllers\Api\MediaController::class, 'store'])
                ->middleware('permission:media.manage');
            Route::get('media/{media}', [\App\Http\Controllers\Api\MediaController::class, 'show'])
                ->middleware('permission:media.view');
            Route::delete('media/{media}', [\App\Http\Controllers\Api\MediaController::class, 'destroy'])
                ->middleware('permission:media.manage');

            Route::apiResource('media-folders', \App\Http\Controllers\Api\Tenant\MediaFolderController::class)
                ->middleware('permission:media.manage');
            Route::get('media-folders-tree', [\App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'tree'])
                ->middleware('permission:media.view');
        });

        // Public routes
        Route::get('health', function () {
            return response()->json(['status' => 'ok']);
        });

        // Public pages CSS endpoint (for storefront loading)
        Route::get('pages/css/merged', [\App\Http\Controllers\Api\PageCssController::class, 'getMergedCss']);

        // Public theme endpoint (no auth required)
        Route::get('themes/public', [\App\Http\Controllers\Api\ThemeController::class, 'publicTheme']);

        // Public page endpoints (no auth required)
        Route::get('pages/public/consent-settings', [\App\Http\Controllers\Api\PageController::class, 'consentSettings']);
        Route::get('pages/public/homepage', [\App\Http\Controllers\Api\PageController::class, 'getHomepage']);
        Route::get('pages/public/{slug}', [\App\Http\Controllers\Api\PageController::class, 'getBySlug']);

        // Public analytics beacon (no auth, rate-limited)
        Route::post('analytics/track', [\App\Http\Controllers\Api\TrackController::class, 'store'])
            ->middleware('throttle:60,1');

        // Stripe webhook endpoint (central billing) — rate-limited to prevent flood
        Route::post('stripe/webhook', [BillingController::class, 'handleWebhook'])
            ->middleware('throttle:120,1');

    });
}
