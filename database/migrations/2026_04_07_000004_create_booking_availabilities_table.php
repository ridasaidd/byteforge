<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resource_id')->constrained('booking_resources')->cascadeOnDelete();
            // 0=Sun … 6=Sat; NULL means this row is a specific-date override
            $table->unsignedTinyInteger('day_of_week')->nullable();
            // Specific date override — takes precedence over day_of_week for that date
            $table->date('specific_date')->nullable();
            $table->time('starts_at');
            $table->time('ends_at');
            // TRUE = the resource is blocked (closed/holiday/vacation) for this window
            $table->boolean('is_blocked')->default(false);
            $table->timestamps();

            $table->index(['resource_id', 'day_of_week']);
            $table->index(['resource_id', 'specific_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_availabilities');
    }
};
