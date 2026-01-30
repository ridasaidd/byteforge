<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds 'settings' to the type enum for storing scoped theme settings customizations.
     */
    public function up(): void
    {
        // MySQL: Use ALTER TABLE to modify ENUM
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE theme_parts MODIFY COLUMN type ENUM('header', 'footer', 'sidebar_left', 'sidebar_right', 'section', 'settings') DEFAULT 'section'");
        }
        // SQLite: ENUM is just TEXT, no modification needed
        // The value will be stored as-is
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            // First delete any 'settings' type records
            DB::table('theme_parts')->where('type', 'settings')->delete();
            
            // Then revert the enum
            DB::statement("ALTER TABLE theme_parts MODIFY COLUMN type ENUM('header', 'footer', 'sidebar_left', 'sidebar_right', 'section') DEFAULT 'section'");
        }
    }
};
