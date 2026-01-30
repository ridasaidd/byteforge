<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds settings_css column to theme_parts table for storing
     * scoped CSS customizations (per tenant/central).
     */
    public function up(): void
    {
        Schema::table('theme_parts', function (Blueprint $table) {
            $table->longText('settings_css')->nullable()->after('puck_data_compiled')
                ->comment('Scoped CSS customizations for this theme part');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('theme_parts', function (Blueprint $table) {
            $table->dropColumn('settings_css');
        });
    }
};
