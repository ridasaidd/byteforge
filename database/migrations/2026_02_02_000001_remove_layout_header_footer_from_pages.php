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
            $table->dropForeign(['layout_id']);
            $table->dropForeign(['header_id']);
            $table->dropForeign(['footer_id']);
            $table->dropColumn(['layout_id', 'header_id', 'footer_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->foreignId('layout_id')->nullable()->constrained('layouts')->onDelete('set null');
            $table->foreignId('header_id')->nullable()->constrained('theme_parts')->onDelete('set null');
            $table->foreignId('footer_id')->nullable()->constrained('theme_parts')->onDelete('set null');
        });
    }
};
