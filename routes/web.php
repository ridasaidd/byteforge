<?php

use Illuminate\Support\Facades\Route;

// routes/web.php, api.php or any other central route files you have

foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {
        // Public landing page - check for homepage or show welcome
        Route::get('/', function () {
            // Check if there's a published homepage
            $homepage = \App\Models\Page::whereNull('tenant_id')
                ->where('is_homepage', true)
                ->where('status', 'published')
                ->first();

            if ($homepage) {
                // If homepage exists, render it using the React app
                return view('dash-central');
            }

            // Otherwise, show the default welcome page
            return view('welcome');
        });

        // Public page viewing (e.g., /pages/about, /pages/contact)
        Route::get('/pages/{slug}', function () {
            return view('dash-central');
        })->where('slug', '[a-z0-9\-]+');

        // Public login page (no auth required)
        Route::get('/login', function () {
            return view('dash-central');
        })->name('login');

        // Central Admin Dashboard (protected routes)
        Route::middleware(['auth:api'])->prefix('dashboard')->group(function () {
            Route::get('/{any?}', function () {
                return view('dash-central');
            })->where('any', '.*');
        });
    });
}
