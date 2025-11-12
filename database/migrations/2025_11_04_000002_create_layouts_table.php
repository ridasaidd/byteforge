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
        Schema::create('layouts', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->nullable();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->foreignId('header_id')->nullable()->constrained('theme_parts')->onDelete('set null');
            $table->foreignId('footer_id')->nullable()->constrained('theme_parts')->onDelete('set null');
            $table->foreignId('sidebar_left_id')->nullable()->constrained('theme_parts')->onDelete('set null');
            $table->foreignId('sidebar_right_id')->nullable()->constrained('theme_parts')->onDelete('set null');
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('layouts');
    }
};
