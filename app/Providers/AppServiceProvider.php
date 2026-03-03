<?php

namespace App\Providers;

use App\Models\Navigation;
use App\Models\ThemePart;
use App\Observers\NavigationObserver;
use App\Observers\ThemePartObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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

        // Identity-aware login rate limiter.
        // Keys by email + IP so that rotating IPs cannot bypass the limit,
        // and one IP brute-forcing many accounts does not lock unrelated users out.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)
                ->by(strtolower((string) $request->input('email')) . '|' . $request->ip());
        });
    }
}
