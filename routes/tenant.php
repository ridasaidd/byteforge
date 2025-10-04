<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware;

use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Here you can register the tenant routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| contains the tenant middleware group. Now create something great!
|
*/
// Debug route
Route::get('/debug', function () {
    return response()->json([
        'message' => 'Tenant route working',
        'tenant_id' => tenant('id'),
        'domain' => request()->getHost(),
    ]);
});

// Tenant API routes
Route::prefix('api')->group(function () {

    // Public tenant routes
    Route::get('info', [App\Http\Controllers\Api\TenantController::class, 'info']);

    // Protected tenant routes - require authentication + tenant membership
    Route::middleware(['auth:api', 'tenant.member'])->group(function () {
        Route::get('dashboard', [App\Http\Controllers\Api\TenantController::class, 'dashboard']);
        Route::apiResource('pages', App\Http\Controllers\Api\PageController::class);
        Route::apiResource('users', App\Http\Controllers\Api\UserController::class)->except(['store', 'update', 'destroy']);
        Route::post('users/{user}/roles', [App\Http\Controllers\Api\UserController::class, 'assignRole']);
        Route::delete('users/{user}/roles/{role}', [App\Http\Controllers\Api\UserController::class, 'removeRole']);
    });
});
Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    Route::get('/', function () {
        return 'This is your multi-tenant application. The id of the current tenant is ' . tenant('id');
    });

    // Debug route
    Route::get('/debug', function () {
        return response()->json([
            'message' => 'Tenant route working',
            'tenant_id' => tenant('id'),
            'domain' => request()->getHost(),
        ]);
    });

    // Tenant API routes
    Route::prefix('api')->group(function () {

        // Public tenant routes
        Route::get('info', [App\Http\Controllers\Api\TenantController::class, 'info']);

        // Protected tenant routes - require authentication
        Route::middleware('auth:api')->group(function () {
            Route::get('dashboard', [App\Http\Controllers\Api\TenantController::class, 'dashboard']);
            Route::apiResource('pages', App\Http\Controllers\Api\PageController::class);
            Route::apiResource('users', App\Http\Controllers\Api\UserController::class)->except(['store', 'update', 'destroy']);
            Route::post('users/{user}/roles', [App\Http\Controllers\Api\UserController::class, 'assignRole']);
            Route::delete('users/{user}/roles/{role}', [App\Http\Controllers\Api\UserController::class, 'removeRole']);

            // Media management routes
            Route::prefix('media')->group(function () {
                Route::get('/', [App\Http\Controllers\Api\Tenant\MediaController::class, 'index']);
                Route::post('/', [App\Http\Controllers\Api\Tenant\MediaController::class, 'store']);
                Route::get('/{id}', [App\Http\Controllers\Api\Tenant\MediaController::class, 'show']);
                Route::put('/{id}', [App\Http\Controllers\Api\Tenant\MediaController::class, 'update']);
                Route::delete('/{id}', [App\Http\Controllers\Api\Tenant\MediaController::class, 'destroy']);
                Route::post('/bulk-delete', [App\Http\Controllers\Api\Tenant\MediaController::class, 'bulkDelete']);
            });

            // Media folder management routes
            Route::prefix('media-folders')->group(function () {
                Route::get('/', [App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'index']);
                Route::get('/tree', [App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'tree']);
                Route::post('/', [App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'store']);
                Route::get('/{id}', [App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'show']);
                Route::put('/{id}', [App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'update']);
                Route::delete('/{id}', [App\Http\Controllers\Api\Tenant\MediaFolderController::class, 'destroy']);
            });
        });
    });
});
