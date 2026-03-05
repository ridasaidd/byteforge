<?php

use App\Services\ThemeService;
use App\Settings\GeneralSettings;
use Illuminate\Support\Facades\Route;

// routes/web.php, api.php or any other central route files you have

foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {
        // Public landing page - check for homepage or show welcome
        Route::get('/', function () {
            /** @var ThemeService $themeService */
            $themeService = app(ThemeService::class);

            // Check if there's a published homepage
            $homepage = \App\Models\Page::whereNull('tenant_id')
                ->where('is_homepage', true)
                ->where('status', 'published')
                ->first();

            // Use getActiveTheme (read-only) on public routes.
            // getOrCreateDefaultTheme auto-provisions themes which is a write-side
            // operation that must not be triggered by anonymous page views.
            $theme = $themeService->getActiveTheme(null);
            $themeCssUrl = $theme?->getCssUrl();

            if ($homepage) {
                // If homepage exists, render it using the public React app
                return view('public-central', [
                    'themeCssUrl' => $themeCssUrl,
                    'activeTheme' => $theme,
                    'analyticsSettings' => app(GeneralSettings::class),
                ]);
            }

            // Otherwise, show the default welcome page
            return view('welcome', [
                'themeCssUrl' => $themeCssUrl,
            ]);
        });

        // Public page viewing (e.g., /pages/about, /pages/contact)
        Route::get('/pages/{slug}', function () {
            /** @var ThemeService $themeService */
            $themeService = app(ThemeService::class);
            $theme = $themeService->getActiveTheme(null);

            return view('public-central', [
                'themeCssUrl' => $theme?->getCssUrl(),
                'activeTheme' => $theme,
                'analyticsSettings' => app(GeneralSettings::class),
            ]);
        })->where('slug', '[a-z0-9\-]+');

        // Public login page (uses dashboard app for auth UI)
        Route::get('/login', function () {
            return view('dash-central');
        })->name('login');

        // Central Admin Dashboard - serves the React SPA shell.
        // No auth middleware here: browsers don't send Bearer tokens on page navigation,
        // so auth:api would redirect to login on every refresh before React can load.
        // Auth protection is handled client-side by ProtectedRoutes in the React app.
        Route::prefix('dashboard')->group(function () {
            Route::get('/{any?}', function () {
                return view('dash-central');
            })->where('any', '.*');
        });
    });
}
