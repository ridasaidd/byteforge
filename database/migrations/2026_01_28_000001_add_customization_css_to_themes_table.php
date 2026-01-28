<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * Phase 6: Theme Customization - Add database-backed CSS columns for customization
     *
     * These columns store customization CSS that overrides base theme CSS from disk files.
     * - settings_css: Custom CSS variables (overrides from Settings tab customization)
     * - header_css: Custom header CSS (overrides from Header tab customization)
     * - footer_css: Custom footer CSS (overrides from Footer tab customization)
     *
     * CSS Cascade:
     * 1. Base theme files from disk (immutable system themes)
     *    - /storage/themes/{id}/{id}_variables.css
     *    - /storage/themes/{id}/{id}_header.css
     *    - /storage/themes/{id}/{id}_footer.css
     * 2. Customization CSS from database (overrides)
     *    - <style>{{ $theme->settings_css }}</style>
     *    - <style>{{ $theme->header_css }}</style>
     *    - <style>{{ $theme->footer_css }}</style>
     *
     * Works for both:
     * - Central storefront (tenant_id = null)
     * - Tenant storefronts (tenant_id = uuid)
     */
    public function up(): void
    {
        Schema::table('themes', function (Blueprint $table) {
            $table->longText('settings_css')->nullable()->after('custom_css')->comment('Customization CSS for theme settings/variables');
            $table->longText('header_css')->nullable()->after('settings_css')->comment('Customization CSS for theme header');
            $table->longText('footer_css')->nullable()->after('header_css')->comment('Customization CSS for theme footer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('themes', function (Blueprint $table) {
            $table->dropColumn(['settings_css', 'header_css', 'footer_css']);
        });
    }
};
