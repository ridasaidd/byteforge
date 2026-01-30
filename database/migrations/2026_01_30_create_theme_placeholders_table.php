<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Introduces theme_placeholders table to separate blueprint placeholder content
     * from live theme_parts instances. This creates a hard wall between the Theme Builder
     * (where templates are created with placeholder content) and the Customize Feature
     * (where tenants/central edit their own live instances).
     *
     * Before: theme_parts table was used for BOTH blueprints AND instances → contamination
     * After: theme_placeholders stores blueprint content, theme_parts stores live content
     */
    public function up(): void
    {
        Schema::create('theme_placeholders', function (Blueprint $table) {
            $table->id();

            // Foreign key to themes table (the blueprint theme)
            $table->foreignId('theme_id')
                ->constrained('themes')
                ->onDelete('cascade');

            // Type of placeholder (header, footer, sidebar_left, sidebar_right, section, etc.)
            // Allows for flexible and extensible placeholder types
            $table->string('type');

            // The actual puck data JSON content for this placeholder section
            // This is what gets copied to theme_parts when theme is activated
            $table->json('content')->nullable();

            // Metadata
            $table->timestamps();

            // Ensure only one placeholder per theme per type
            // Prevents duplicate placeholder definitions
            $table->unique(['theme_id', 'type']);

            // Indexes for quick lookups
            $table->index('theme_id');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('theme_placeholders');
    }
};
