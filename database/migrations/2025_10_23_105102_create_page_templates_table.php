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
        Schema::create('page_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('category'); // 'business', 'portfolio', 'blog', 'ecommerce', 'landing', etc.
            $table->string('preview_image')->nullable(); // URL to preview screenshot
            $table->json('puck_data'); // The complete Puck page structure
            $table->json('meta')->nullable(); // Additional metadata (author, tags, etc.)
            $table->boolean('is_active')->default(true);
            $table->integer('usage_count')->default(0); // Track popularity
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('page_templates');
    }
};
