<?php

namespace App\Providers;

use App\Models\Navigation;
use App\Models\ThemePart;
use App\Observers\NavigationObserver;
use App\Observers\ThemePartObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register observers
        Navigation::observe(NavigationObserver::class);
        ThemePart::observe(ThemePartObserver::class);
    }
}
