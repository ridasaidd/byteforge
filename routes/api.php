<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SuperadminController;

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
            Route::apiResource('tenants', SuperadminController::class);
            Route::apiResource('users', SuperadminController::class);
            Route::post('tenants/{tenant}/users', [SuperadminController::class, 'addUserToTenant']);
            Route::delete('tenants/{tenant}/users/{user}', [SuperadminController::class, 'removeUserFromTenant']);
        });

        // Public routes
        Route::get('health', function () {
            return response()->json(['status' => 'ok']);
        });

    });
}
