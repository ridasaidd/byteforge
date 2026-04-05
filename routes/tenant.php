<?php

declare(strict_types=1);

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LayoutController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\NavigationController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TenantPaymentProviderController;
use App\Http\Controllers\Api\Tenant\MediaFolderController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\ThemePartController;
use App\Http\Controllers\Api\UserController;
use App\Models\Page;
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
    'permission.team',
])->group(function () {
    // Public storefront — serve tenant SPA with theme + analytics scripts injected
    Route::get('/', function () {
        try {
            $analyticsSettings = app(\App\Settings\TenantSettings::class);
        } catch (\Throwable $e) {
            $analyticsSettings = null;
        }
        $initialPageTitle = null;
        try {
            $homepage = Page::query()
                ->where('tenant_id', tenant('id'))
                ->where('is_homepage', true)
                ->where('status', 'published')
                ->first();

            if ($homepage) {
                $initialPageTitle = $homepage->meta_data['meta_title'] ?? $homepage->title;
            }
        } catch (\Throwable $e) {
            $initialPageTitle = null;
        }
        try {
            $activeTheme = app(\App\Services\ThemeService::class)->getActiveTheme(tenant('id'));
        } catch (\Throwable $e) {
            $activeTheme = null;
        }
        return view('public-tenant', compact('analyticsSettings', 'activeTheme', 'initialPageTitle'));
    });

    Route::get('/pages/{slug}', function (string $slug) {
        try {
            $analyticsSettings = app(\App\Settings\TenantSettings::class);
        } catch (\Throwable $e) {
            $analyticsSettings = null;
        }
        $initialPageTitle = null;
        try {
            $page = Page::query()
                ->where('tenant_id', tenant('id'))
                ->where('slug', $slug)
                ->where('status', 'published')
                ->first();

            if ($page) {
                $initialPageTitle = $page->meta_data['meta_title'] ?? $page->title;
            }
        } catch (\Throwable $e) {
            $initialPageTitle = null;
        }
        try {
            $activeTheme = app(\App\Services\ThemeService::class)->getActiveTheme(tenant('id'));
        } catch (\Throwable $e) {
            $activeTheme = null;
        }
        return view('public-tenant', compact('analyticsSettings', 'activeTheme', 'initialPageTitle'));
    })->where('slug', '[a-z0-9\-]+');

    // Tenant CMS shell and login page
    Route::get('/login', function () {
        return view('dash-tenant');
    })->name('tenant.login');

    // Backward-compatible dashboard URL shim for tenant domains.
    Route::get('/dashboard/{any?}', function (?string $any = null) {
        return redirect('/cms' . ($any ? '/' . $any : ''));
    })->where('any', '.*');

    Route::get('/cms/{any?}', function () {
        return view('dash-tenant');
    })->where('any', '.*');
});

// Tenant API routes
Route::middleware([
    'api',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
    'permission.team',
])->prefix('api')->group(function () {

    // Public tenant routes
    Route::get('info', [TenantController::class, 'info']);

    // Public pages CSS endpoint (for tenant storefront)
    Route::get('pages/css/merged', [\App\Http\Controllers\Api\PageCssController::class, 'getMergedCss']);

    // Public storefront page endpoints (Phase 9.6 — mirrors central api.php for tenant domain)
    Route::get('themes/public', [\App\Http\Controllers\Api\ThemeController::class, 'publicTheme']);
    Route::get('pages/public/consent-settings', [\App\Http\Controllers\Api\PageController::class, 'consentSettings']);
    Route::get('pages/public/homepage', [\App\Http\Controllers\Api\PageController::class, 'getHomepage']);
    Route::get('pages/public/{slug}', [\App\Http\Controllers\Api\PageController::class, 'getBySlug']);

    // Public analytics beacon (no auth, rate-limited)
    Route::post('analytics/track', [\App\Http\Controllers\Api\TrackController::class, 'store'])
        ->middleware('throttle:60,1');

    // Provider callbacks/webhooks (no auth)
    Route::post('payments/stripe/webhook', [PaymentWebhookController::class, 'stripe']);
    Route::post('payments/swish/callback', [PaymentWebhookController::class, 'swish']);
    Route::post('payments/klarna/callback', [PaymentWebhookController::class, 'klarna']);

    // Tenant auth routes
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

        Route::middleware(['auth:api', 'tenant.membership'])->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::post('refresh', [AuthController::class, 'refresh']);
            Route::get('user', [AuthController::class, 'user']);
            Route::put('user', [AuthController::class, 'updateProfile']);
            Route::put('password', [AuthController::class, 'updatePassword']);
            Route::patch('locale', [AuthController::class, 'updateLocale']);
            Route::post('avatar', [AuthController::class, 'uploadAvatar']);
            Route::delete('avatar', [AuthController::class, 'deleteAvatar']);
        });
    });

    // Protected tenant routes - require authentication
    Route::middleware(['auth:api', 'tenant.membership'])->group(function () {
        Route::get('dashboard', [TenantController::class, 'dashboard']);

        // Resource routes — per-action permission checks
        Route::get('pages',           [PageController::class, 'index'])->middleware('permission:pages.view');
        Route::post('pages',          [PageController::class, 'store'])->middleware('permission:pages.create');
        Route::get('pages/{page}',    [PageController::class, 'show'])->middleware('permission:pages.view');
        Route::put('pages/{page}',    [PageController::class, 'update'])->middleware('permission:pages.edit');
        Route::patch('pages/{page}',  [PageController::class, 'update'])->middleware('permission:pages.edit');
        Route::delete('pages/{page}', [PageController::class, 'destroy'])->middleware('permission:pages.delete');

        Route::get('navigations', [NavigationController::class, 'index'])->middleware('permission:navigation.view');
        Route::post('navigations', [NavigationController::class, 'store'])->middleware('permission:navigation.create');
        Route::get('navigations/{navigation}', [NavigationController::class, 'show'])->middleware('permission:navigation.view');
        Route::put('navigations/{navigation}', [NavigationController::class, 'update'])->middleware('permission:navigation.edit');
        Route::patch('navigations/{navigation}', [NavigationController::class, 'update'])->middleware('permission:navigation.edit');
        Route::delete('navigations/{navigation}', [NavigationController::class, 'destroy'])->middleware('permission:navigation.delete');
        Route::get('theme-parts', [ThemePartController::class, 'index'])->middleware('permission:themes.view');
        Route::post('theme-parts', [ThemePartController::class, 'store'])->middleware('permission:themes.manage');
        Route::get('theme-parts/{theme_part}', [ThemePartController::class, 'show'])->middleware('permission:themes.view');
        Route::put('theme-parts/{theme_part}', [ThemePartController::class, 'update'])->middleware('permission:themes.manage');
        Route::patch('theme-parts/{theme_part}', [ThemePartController::class, 'update'])->middleware('permission:themes.manage');
        Route::delete('theme-parts/{theme_part}', [ThemePartController::class, 'destroy'])->middleware('permission:themes.manage');
        Route::get('layouts', [LayoutController::class, 'index'])->middleware('permission:layouts.view');
        Route::post('layouts', [LayoutController::class, 'store'])->middleware('permission:layouts.manage');
        Route::get('layouts/{layout}', [LayoutController::class, 'show'])->middleware('permission:layouts.view');
        Route::put('layouts/{layout}', [LayoutController::class, 'update'])->middleware('permission:layouts.manage');
        Route::patch('layouts/{layout}', [LayoutController::class, 'update'])->middleware('permission:layouts.manage');
        Route::delete('layouts/{layout}', [LayoutController::class, 'destroy'])->middleware('permission:layouts.manage');

        // Theme Customization (Phase 6) - Tenant
        Route::get('themes', [\App\Http\Controllers\Api\ThemeController::class, 'index'])
            ->middleware('permission:themes.view');
        Route::get('themes/active', [\App\Http\Controllers\Api\ThemeController::class, 'active'])
            ->middleware('permission:themes.view');
        Route::post('themes/activate', [\App\Http\Controllers\Api\ThemeController::class, 'activate'])
            ->middleware('permission:themes.activate|themes.manage');
        Route::get('themes/active/templates', [\App\Http\Controllers\Api\ThemeController::class, 'activeTemplates'])
            ->middleware('permission:themes.view');
        Route::get('themes/{theme}', [\App\Http\Controllers\Api\ThemeController::class, 'show'])
            ->middleware('permission:themes.view');
        Route::get('themes/{theme}/customization', [\App\Http\Controllers\Api\ThemeCustomizationController::class, 'getCustomization'])
            ->middleware('permission:themes.view');
        Route::post('themes/{theme}/customization/{section}', [\App\Http\Controllers\Api\ThemeCustomizationController::class, 'saveSection'])
            ->middleware('permission:themes.manage');

        Route::apiResource('users', UserController::class)->except(['store', 'update', 'destroy'])
            ->middleware('permission:view users');

        Route::get('roles', [UserController::class, 'roles'])->middleware('permission:view users');

        // Media management — per-action permission checks
        Route::get('media', [MediaController::class, 'index'])->middleware('permission:media.view');
        Route::post('media', [MediaController::class, 'store'])->middleware('permission:media.manage');
        Route::get('media/{media}', [MediaController::class, 'show'])->middleware('permission:media.view');
        Route::delete('media/{media}', [MediaController::class, 'destroy'])->middleware('permission:media.manage');
        Route::get('media-folders', [MediaFolderController::class, 'index'])->middleware('permission:media.view');
        Route::post('media-folders', [MediaFolderController::class, 'store'])->middleware('permission:media.manage');
        Route::get('media-folders/{id}', [MediaFolderController::class, 'show'])->middleware('permission:media.view');
        Route::put('media-folders/{id}', [MediaFolderController::class, 'update'])->middleware('permission:media.manage');
        Route::patch('media-folders/{id}', [MediaFolderController::class, 'update'])->middleware('permission:media.manage');
        Route::delete('media-folders/{id}', [MediaFolderController::class, 'destroy'])->middleware('permission:media.manage');
        Route::get('media-folders-tree', [MediaFolderController::class, 'tree'])
            ->middleware('permission:media.view');

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

        // Payment provider configuration (Phase 10.3)
        Route::prefix('payment-providers')->group(function () {
            Route::get('/', [TenantPaymentProviderController::class, 'index'])->middleware('permission:payments.view');
            Route::post('/', [TenantPaymentProviderController::class, 'store'])->middleware('permission:payments.manage');
            Route::put('{provider}', [TenantPaymentProviderController::class, 'update'])->middleware('permission:payments.manage');
            Route::delete('{provider}', [TenantPaymentProviderController::class, 'destroy'])->middleware('permission:payments.manage');
            Route::post('{provider}/test', [TenantPaymentProviderController::class, 'testConnection'])->middleware('permission:payments.manage');
        });

        // Stripe payments (Phase 10.4)
        Route::post('payments/stripe/create-intent', [PaymentController::class, 'createStripeIntent'])
            ->middleware('permission:payments.manage');

        // Swish payments (Phase 10.5)
        Route::post('payments/swish/create', [PaymentController::class, 'createSwishPayment'])
            ->middleware('permission:payments.manage');
        Route::get('payments/swish/{id}/status', [PaymentController::class, 'swishStatus'])
            ->middleware('permission:payments.view');

        // Klarna payments (Phase 10.6)
        Route::post('payments/klarna/create-session', [PaymentController::class, 'createKlarnaSession'])
            ->middleware('permission:payments.manage');
        Route::post('payments/klarna/authorize', [PaymentController::class, 'authorizeKlarna'])
            ->middleware('permission:payments.manage');
        Route::post('payments/klarna/capture/{id}', [PaymentController::class, 'captureKlarna'])
            ->middleware('permission:payments.manage');

        // Payment history + refunds (Phase 10.7)
        Route::get('payments', [PaymentController::class, 'index'])
            ->middleware('permission:payments.view');
        Route::get('payments/{payment}', [PaymentController::class, 'show'])
            ->whereNumber('payment')
            ->middleware('permission:payments.view');
        Route::post('payments/{payment}/refund', [PaymentController::class, 'refund'])
            ->whereNumber('payment')
            ->middleware('permission:payments.refund');
    });
});
