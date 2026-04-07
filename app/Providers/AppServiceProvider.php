<?php

namespace App\Providers;

use App\Models\Navigation;
use App\Models\Tenant;
use App\Models\TenantAddon;
use App\Models\ThemePart;
use App\Observers\NavigationObserver;
use App\Observers\TenantAddonObserver;
use App\Observers\ThemePartObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Cashier;
use Laravel\Passport\Passport;
use Laravel\Pennant\Feature;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Disable Cashier's default /stripe/webhook route — it targets the User model
        // which is wrong for this multi-tenant setup. We use our own webhook handler
        // at /api/stripe/webhook via BillingController::handleWebhook instead.
        Cashier::ignoreRoutes();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Tenancy may suffix storage_path() per tenant. Pin Passport keys to
        // the central storage directory so token creation works on tenant domains.
        Passport::loadKeysFrom(base_path('storage'));

        // Register observers
        Navigation::observe(NavigationObserver::class);
        ThemePart::observe(ThemePartObserver::class);
        TenantAddon::observe(TenantAddonObserver::class);

        // Define tenant add-on features for Pennant.
        //
        // Pennant caches each resolution in the features table so that subsequent
        // requests read a single indexed row instead of joining TenantAddon + addons.
        // TenantAddonObserver busts the cached value whenever an add-on changes state.
        //
        // Add a new Feature::define() call here whenever a new add-on slug is introduced.
        Feature::define('booking', function ($scope): bool {
            if (! $scope instanceof Tenant) {
                return false;
            }

            return TenantAddon::active()
                ->forTenant((string) $scope->id)
                ->whereHas('addon', fn ($q) => $q->where('feature_flag', 'booking'))
                ->exists();
        });

        Feature::define('payments', function ($scope): bool {
            if (! $scope instanceof Tenant) {
                return false;
            }

            return TenantAddon::active()
                ->forTenant((string) $scope->id)
                ->whereHas('addon', fn ($q) => $q->where('feature_flag', 'payments'))
                ->exists();
        });

        // Identity-aware login rate limiter.
        // Keys by email + IP so that rotating IPs cannot bypass the limit,
        // and one IP brute-forcing many accounts does not lock unrelated users out.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)
                ->by(strtolower((string) $request->input('email')) . '|' . $request->ip());
        });
    }
}
