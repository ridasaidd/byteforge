<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanic_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workshop_id')->constrained('mechanic_workshops')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('mechanic_services')->nullOnDelete();
            $table->foreignId('customer_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('scheduled_at');
            $table->string('status')->default('pending'); // pending, confirmed, cancelled, completed
            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->index(['workshop_id', 'status']);
            $table->index(['customer_user_id', 'status']);
            $table->index(['workshop_id', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanic_bookings');
    }
};
