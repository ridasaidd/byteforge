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
        Schema::table('pages', function (Blueprint $table) {
            $table->json('puck_data_compiled')->nullable()->after('puck_data');
            $table->foreignId('layout_id')->nullable()->after('page_type')->constrained('layouts')->onDelete('set null');
            $table->foreignId('header_id')->nullable()->after('layout_id')->constrained('theme_parts')->onDelete('set null');
            $table->foreignId('footer_id')->nullable()->after('header_id')->constrained('theme_parts')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropForeign(['layout_id']);
            $table->dropForeign(['header_id']);
            $table->dropForeign(['footer_id']);
            $table->dropColumn(['puck_data_compiled', 'layout_id', 'header_id', 'footer_id']);
        });
    }
};
