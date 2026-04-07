<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_services', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->enum('booking_mode', ['slot', 'range']);
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->unsignedSmallInteger('slot_interval_minutes')->nullable();
            $table->unsignedTinyInteger('min_nights')->nullable();
            $table->unsignedSmallInteger('max_nights')->nullable();
            $table->unsignedSmallInteger('buffer_minutes')->default(0);
            $table->unsignedSmallInteger('advance_notice_hours')->default(0);
            $table->unsignedSmallInteger('max_advance_days')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->char('currency', 3)->default('SEK');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'booking_mode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_services');
    }
};
