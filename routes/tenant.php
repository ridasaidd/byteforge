<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\NavigationController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\UserController;

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
])->group(function () {
    Route::get('/', function () {
       // dd(\App\Models\User::all());
        return 'This is your multi-tenant application. The id of the current tenant is ' . tenant('id');
    });
});

// Tenant API routes
Route::middleware([
    'api',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->prefix('api')->group(function () {

    // Public tenant routes
    Route::get('info', [TenantController::class, 'info']);

    // Protected tenant routes - require authentication
    Route::middleware('auth:api')->group(function () {
        Route::get('dashboard', [TenantController::class, 'dashboard']);
        
        // Resource routes
        Route::apiResource('pages', PageController::class);
        Route::apiResource('navigations', NavigationController::class);
        Route::apiResource('users', UserController::class)->except(['store', 'update', 'destroy']);
        
        // User role management
        Route::post('users/{user}/roles', [UserController::class, 'assignRole']);
        Route::delete('users/{user}/roles/{role}', [UserController::class, 'removeRole']);
        
        // Settings management
        Route::get('settings', [SettingsController::class, 'index']);
        Route::put('settings', [SettingsController::class, 'update']);
        
        // Activity logs
        Route::get('activity-logs', [ActivityLogController::class, 'index']);
        Route::get('activity-logs/{id}', [ActivityLogController::class, 'show']);
    });
});
