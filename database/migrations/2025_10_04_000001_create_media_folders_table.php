<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_folders', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->nullable();
            $table->string('name');
            $table->string('slug');
            $table->string('path')->nullable(); // Full path like "/Products/Summer 2024"
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // Extra data (color, icon, etc.)
            $table->timestamps();

            // Indexes
            $table->index('tenant_id');
            $table->index('parent_id');
            $table->index('slug');

            // Foreign key for nested folders
            $table->foreign('parent_id')
                ->references('id')
                ->on('media_folders')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_folders');
    }
};
