<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanic_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workshop_id')->constrained('mechanic_workshops')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('price_min')->nullable(); // in minor currency units (öre/cents)
            $table->unsignedInteger('price_max')->nullable();
            $table->string('currency', 3)->default('SEK');
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['workshop_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanic_services');
    }
};
