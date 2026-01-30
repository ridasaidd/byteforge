<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Migrates existing blueprint theme_parts (theme_id set, tenant_id NULL)
     * to the new theme_placeholders table.
     *
     * After this migration:
     * - theme_placeholders contains all blueprint content (header, footer, sidebars)
     * - theme_parts contains only live instance content (tenant_id set, theme_id NULL)
     * - No contamination between blueprint and instances
     */
    public function up(): void
    {
        DB::transaction(function () {
            // Find all blueprint theme_parts (theme_id set, tenant_id NULL)
            $blueprintParts = DB::table('theme_parts')
                ->whereNotNull('theme_id')
                ->whereNull('tenant_id')
                ->get();

            // Move each to theme_placeholders
            foreach ($blueprintParts as $part) {
                DB::table('theme_placeholders')->insert([
                    'theme_id' => $part->theme_id,
                    'type' => $part->type,
                    'content' => $part->puck_data_raw,
                    'created_at' => $part->created_at ?? now(),
                    'updated_at' => $part->updated_at ?? now(),
                ]);
            }

            // Delete blueprint theme_parts from theme_parts table
            // They are now in theme_placeholders table
            DB::table('theme_parts')
                ->whereNotNull('theme_id')
                ->whereNull('tenant_id')
                ->delete();
        });
    }

    /**
     * Reverse the migrations.
     *
     * If rolling back, recreate theme_parts from theme_placeholders
     */
    public function down(): void
    {
        DB::transaction(function () {
            // Recreate theme_parts from theme_placeholders
            $placeholders = DB::table('theme_placeholders')->get();

            foreach ($placeholders as $placeholder) {
                DB::table('theme_parts')->insert([
                    'theme_id' => $placeholder->theme_id,
                    'tenant_id' => null,
                    'name' => null,
                    'slug' => null,
                    'type' => $placeholder->type,
                    'puck_data_raw' => $placeholder->content,
                    'puck_data_compiled' => null,
                    'status' => 'published',
                    'sort_order' => 0,
                    'created_by' => 1, // Default to superadmin
                    'created_at' => $placeholder->created_at,
                    'updated_at' => $placeholder->updated_at,
                ]);
            }
        });
    }
};
