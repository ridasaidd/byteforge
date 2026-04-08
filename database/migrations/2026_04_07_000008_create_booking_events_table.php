<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();

            // Status transition audit — may be null for non-status events (e.g. "note_added")
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);

            // Actor — system|tenant_user|customer; actor_id maps to users.id for tenant_user
            $table->enum('actor_type', ['system', 'tenant_user', 'customer']);
            $table->unsignedBigInteger('actor_id')->nullable();

            $table->string('note', 255)->nullable();

            // Append-only immutable event log — no updates, no deletes, no soft deletes
            $table->timestamp('created_at')->nullable();
            // Deliberately no updated_at column

            $table->index(['booking_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_events');
    }
};
