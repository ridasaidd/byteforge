<?php

use Illuminate\Support\Facades\Route;


// routes/web.php, api.php or any other central route files you have

foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {
        // Public landing page
        Route::get('/', function () {
            return view('welcome');
        });

        // Central Admin Dashboard (protected routes)
        Route::middleware(['auth:api'])->prefix('dashboard')->group(function () {
            Route::get('/{any?}', function () {
                return view('dash-central');
            })->where('any', '.*');
        });
    });
}
