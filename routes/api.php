<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SuperadminController;
use Illuminate\Support\Facades\Route;

// Central API routes - available on central domains
foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {

        // Authentication routes
        Route::prefix('auth')->group(function () {
            Route::post('login', [AuthController::class, 'login']);
            Route::post('register', [AuthController::class, 'register']);
            Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
            Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
            Route::get('user', [AuthController::class, 'user'])->middleware('auth:api');
        });

        // Superadmin routes - require superadmin role
        Route::middleware(['auth:api', 'role:superadmin'])->prefix('superadmin')->group(function () {
            // Tenants management
            Route::get('tenants', [SuperadminController::class, 'indexTenants']);
            Route::post('tenants', [SuperadminController::class, 'storeTenant']);
            Route::get('tenants/{tenant}', [SuperadminController::class, 'showTenant']);
            Route::put('tenants/{tenant}', [SuperadminController::class, 'updateTenant']);
            Route::delete('tenants/{tenant}', [SuperadminController::class, 'destroyTenant']);

            // Users management
            Route::get('users', [SuperadminController::class, 'indexUsers']);
            Route::post('users', [SuperadminController::class, 'storeUser']);
            Route::get('users/{user}', [SuperadminController::class, 'showUser']);
            Route::put('users/{user}', [SuperadminController::class, 'updateUser']);
            Route::delete('users/{user}', [SuperadminController::class, 'destroyUser']);

            // Activity logs (central)
            Route::get('activity-logs', [SuperadminController::class, 'indexActivity']);

            // Tenant-User relationships
            Route::post('tenants/{tenant}/users', [SuperadminController::class, 'addUserToTenant']);
            Route::delete('tenants/{tenant}/users/{user}', [SuperadminController::class, 'removeUserFromTenant']);
        });

        // Public routes
        Route::get('health', function () {
            return response()->json(['status' => 'ok']);
        });

    });
}
