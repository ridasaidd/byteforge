<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Central\RoleController;
use App\Http\Controllers\Api\Central\PermissionController;
use App\Http\Controllers\Api\Central\TenantController;
use App\Http\Controllers\Api\Central\UserController;

// Central API routes - available on central domains
foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {

        // Authentication routes (public)
        Route::prefix('auth')->group(function () {
            Route::post('login', [AuthController::class, 'login']);
            Route::post('register', [AuthController::class, 'register']);
            Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
            Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
            Route::get('user', [AuthController::class, 'user'])->middleware('auth:api');
        });

        // Superadmin routes - require superadmin type + permissions
        Route::middleware(['auth:api', 'superadmin'])->prefix('superadmin')->group(function () {
            // Role management
            Route::apiResource('roles', RoleController::class);

            // Permission management
            Route::apiResource('permissions', PermissionController::class);

            // Tenant management
            Route::apiResource('tenants', TenantController::class);

            // User management
            Route::apiResource('users', UserController::class);

            // Tenant-User relationship management
            Route::post('tenants/{tenant}/users', [TenantController::class, 'addUser'])->name('superadmin.tenants.addUser');
            Route::delete('tenants/{tenant}/users/{user}', [TenantController::class, 'removeUser'])->name('superadmin.tenants.removeUser');
        });

        // Public routes
        Route::get('health', function () {
            return response()->json(['status' => 'ok']);
        });

    });
}
