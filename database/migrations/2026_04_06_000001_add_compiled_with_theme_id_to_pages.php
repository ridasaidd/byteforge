<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            // Tracks which theme's header/footer are baked into puck_data_compiled.
            // Used for lazy recompilation: if this differs from the current active theme,
            // the page is recompiled on first public access so users always see fresh content.
            // No FK constraint: the theme may be deleted after the page was compiled.
            $table->unsignedBigInteger('compiled_with_theme_id')->nullable()->after('puck_data_compiled');
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn('compiled_with_theme_id');
        });
    }
};
