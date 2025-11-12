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
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->nullable();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->string('base_theme')->nullable(); // References folder in storage/themes/
            $table->json('theme_data'); // The actual theme JSON (copy from base or customized)
            $table->boolean('is_active')->default(false);
            $table->text('description')->nullable();
            $table->string('author')->nullable();
            $table->string('version')->default('1.0.0');
            $table->timestamps();

            // Ensure unique slug per tenant
            $table->unique(['tenant_id', 'slug']);
            // Ensure only one active theme per tenant
            $table->index(['tenant_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('themes');
    }
};
