<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();

            // Notification type slug, e.g. "booking_confirmed", "reminder_24h"
            $table->string('type', 60);
            $table->enum('channel', ['email', 'push', 'sms'])->default('email');
            $table->enum('recipient', ['customer', 'staff', 'admin']);

            // Append-only — no update path; sent_at is authoritative
            $table->timestamp('sent_at');
            $table->timestamp('created_at')->nullable();
            // Deliberately no updated_at — this table is write-once

            $table->index(['booking_id', 'type', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_notifications');
    }
};
