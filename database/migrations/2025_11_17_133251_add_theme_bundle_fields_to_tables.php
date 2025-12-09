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
        // Add theme_id to page_templates to link templates to themes
        Schema::table('page_templates', function (Blueprint $table) {
            $table->foreignId('theme_id')->nullable()->after('id')->constrained('themes')->onDelete('cascade');
            $table->index('theme_id');
        });

        // Add theme_id to theme_parts to link parts to themes (for blueprint storage)
        // theme_parts can be:
        //   1. Theme blueprints: theme_id set, tenant_id NULL (central)
        //   2. Tenant instances: theme_id NULL, tenant_id set (activated)
        Schema::table('theme_parts', function (Blueprint $table) {
            $table->foreignId('theme_id')->nullable()->after('tenant_id')->constrained('themes')->onDelete('set null');
            $table->index(['theme_id', 'type']);
        });

        // Add additional fields to themes table
        Schema::table('themes', function (Blueprint $table) {
            $table->boolean('is_system_theme')->default(false)->after('is_active');
            $table->string('preview_image')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('page_templates', function (Blueprint $table) {
            $table->dropForeign(['theme_id']);
            $table->dropColumn('theme_id');
        });

        Schema::table('theme_parts', function (Blueprint $table) {
            $table->dropForeign(['theme_id']);
            $table->dropColumn('theme_id');
        });

        Schema::table('themes', function (Blueprint $table) {
            $table->dropColumn(['is_system_theme', 'preview_image']);
        });
    }
};
