<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->after('id')->index();
        });

        // Update unique constraint to include tenant_id
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['group', 'name']);
            $table->unique(['tenant_id', 'group', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'group', 'name']);
            $table->unique(['group', 'name']);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
    }
};
