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
            Route::put('user', [AuthController::class, 'updateProfile'])->middleware('auth:api');
            Route::put('password', [AuthController::class, 'updatePassword'])->middleware('auth:api');
        });

        // Superadmin routes - require superadmin role
        Route::prefix('superadmin')->middleware(['auth:api'])->group(function () {
            // Tenants management
            Route::get('tenants', [SuperadminController::class, 'indexTenants'])->middleware('permission:view tenants');
            Route::post('tenants', [SuperadminController::class, 'storeTenant'])->middleware('permission:manage tenants');
            Route::get('tenants/{tenant}', [SuperadminController::class, 'showTenant'])->middleware('permission:view tenants');
            Route::put('tenants/{tenant}', [SuperadminController::class, 'updateTenant'])->middleware('permission:manage tenants');
            Route::delete('tenants/{tenant}', [SuperadminController::class, 'destroyTenant'])->middleware('permission:manage tenants');

            // Users management
            Route::get('users', [SuperadminController::class, 'indexUsers'])->middleware('permission:view users');
            Route::post('users', [SuperadminController::class, 'storeUser'])->middleware('permission:manage users');
            Route::get('users/{user}', [SuperadminController::class, 'showUser'])->middleware('permission:view users');
            Route::put('users/{user}', [SuperadminController::class, 'updateUser'])->middleware('permission:manage users');
            Route::delete('users/{user}', [SuperadminController::class, 'destroyUser'])->middleware('permission:manage users');

            // Activity logs (central)
            Route::get('activity-logs', [SuperadminController::class, 'indexActivity'])->middleware('permission:view activity logs');

            // Settings management
            Route::get('settings', [SuperadminController::class, 'getSettings'])->middleware('permission:view settings');
            Route::put('settings', [SuperadminController::class, 'updateSettings'])->middleware('permission:manage settings');

            // Tenant-User relationships
            Route::post('tenants/{tenant}/users', [SuperadminController::class, 'addUserToTenant'])->middleware('permission:manage tenants');
            Route::delete('tenants/{tenant}/users/{user}', [SuperadminController::class, 'removeUserFromTenant'])->middleware('permission:manage tenants');

            // Roles management
            Route::get('roles', [\App\Http\Controllers\Api\RoleController::class, 'index'])->middleware('permission:view users|manage users|manage roles');
            Route::post('roles', [\App\Http\Controllers\Api\RoleController::class, 'store'])->middleware('permission:manage roles');
            Route::get('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'show'])->middleware('permission:manage roles');
            Route::put('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'update'])->middleware('permission:manage roles');
            Route::delete('roles/{role}', [\App\Http\Controllers\Api\RoleController::class, 'destroy'])->middleware('permission:manage roles');

            // Permissions management
            Route::apiResource('permissions', \App\Http\Controllers\Api\PermissionController::class)->middleware('permission:manage roles');

            // Assign permissions to a role
            Route::post('roles/{role}/permissions', [\App\Http\Controllers\Api\RoleAssignmentController::class, 'assignPermissions'])->middleware('permission:manage roles');

            // Assign roles to a user
            Route::post('users/{user}/roles', [\App\Http\Controllers\Api\RoleAssignmentController::class, 'assignRoles'])->middleware('permission:manage users');
        });

        // Public routes
        Route::get('health', function () {
            return response()->json(['status' => 'ok']);
        });

    });
}
