<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Register tenant routes
            if (file_exists(base_path('routes/tenant.php'))) {
                Route::middleware([
                    \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
                    \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
                ])
                ->group(base_path('routes/tenant.php'));
            }
        }
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register custom middleware aliases
        $middleware->alias([
            'superadmin' => \App\Http\Middleware\SuperadminMiddleware::class,
            'tenant.member' => \App\Http\Middleware\TenantMemberMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
