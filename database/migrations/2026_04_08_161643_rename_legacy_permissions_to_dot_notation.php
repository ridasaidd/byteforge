<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Rename legacy natural-language permission names to dot-notation standard.
     *
     * Old → New
     *   view users              → users.view
     *   manage users            → users.manage
     *   manage roles            → roles.manage
     *   view activity logs      → activity.view
     *   view settings           → settings.view
     *   manage settings         → settings.manage
     *   view analytics          → analytics.view
     *   view platform analytics → analytics.platform
     *   view dashboard stats    → analytics.dashboard
     *   view billing            → billing.view
     *   manage billing          → billing.manage
     *   view tenants            → tenants.view
     *   manage tenants          → tenants.manage
     */
    private array $renames = [
        'view users'              => 'users.view',
        'manage users'            => 'users.manage',
        'manage roles'            => 'roles.manage',
        'view activity logs'      => 'activity.view',
        'view settings'           => 'settings.view',
        'manage settings'         => 'settings.manage',
        'view analytics'          => 'analytics.view',
        'view platform analytics' => 'analytics.platform',
        'view dashboard stats'    => 'analytics.dashboard',
        'view billing'            => 'billing.view',
        'manage billing'          => 'billing.manage',
        'view tenants'            => 'tenants.view',
        'manage tenants'          => 'tenants.manage',
    ];

    public function up(): void
    {
        foreach ($this->renames as $old => $new) {
            DB::table('permissions')->where('name', $old)->update(['name' => $new]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        foreach ($this->renames as $old => $new) {
            DB::table('permissions')->where('name', $new)->update(['name' => $old]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
