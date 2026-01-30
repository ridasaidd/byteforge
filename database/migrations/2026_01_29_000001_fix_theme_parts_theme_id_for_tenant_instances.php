<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Fix Bug: Tenant theme_parts incorrectly had theme_id set
     *
     * Per the original migration design (2025_11_17_133251_add_theme_bundle_fields_to_tables.php):
     * - Theme blueprints: theme_id set, tenant_id NULL (central)
     * - Tenant instances: theme_id NULL, tenant_id set (activated)
     *
     * Bug: ThemeService::cloneSystemTheme() was setting theme_id for tenant instances
     * Fix: Set theme_id = NULL for all tenant instances (where tenant_id IS NOT NULL)
     */
    public function up(): void
    {
        // Fix existing tenant theme_parts to have theme_id = NULL
        DB::table('theme_parts')
            ->whereNotNull('tenant_id')  // Only tenant instances
            ->update(['theme_id' => null]);

        // Note: This is safe because:
        // 1. Tenant instances should have had theme_id = NULL from the start
        // 2. The relationship is maintained via tenant_id and type
        // 3. Content is already independent (puck_data_raw is copied)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot reliably reverse this migration because we don't know
        // which system theme each tenant instance was cloned from
        // This is acceptable because the bug was causing incorrect data
    }
};
