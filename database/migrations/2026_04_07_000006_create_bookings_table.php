<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('service_id')->constrained('booking_services')->restrictOnDelete();
            $table->foreignId('resource_id')->constrained('booking_resources')->restrictOnDelete();

            // Customer info — stored directly for guest-friendly flow (no account required)
            $table->string('customer_name', 120);
            $table->string('customer_email', 255);
            $table->string('customer_phone', 30)->nullable();

            // Timing — always stored in UTC
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();

            // Status lifecycle
            // awaiting_payment added now to avoid a breaking migration when Phase 14 ships
            $table->enum('status', [
                'pending',
                'pending_hold',
                'awaiting_payment',
                'confirmed',
                'completed',
                'cancelled',
                'no_show',
            ])->default('pending');

            // Slot hold expiry — used by the hold/confirm two-step flow
            $table->dateTime('hold_expires_at')->nullable();

            // Recurring booking seed — no business logic in v1; just the FK
            $table->foreignId('parent_booking_id')->nullable()->constrained('bookings')->nullOnDelete();

            // Guest self-management token — hex(random_bytes(32)), 64 chars
            // makeHidden in model; never returned in list responses
            $table->string('management_token', 64)->unique()->nullable();
            $table->dateTime('token_expires_at')->nullable();
            $table->boolean('notification_opt_out')->default(false);

            // Cross-addon payment link (Phase 14)
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();

            // Notes
            $table->text('internal_notes')->nullable();
            $table->text('customer_notes')->nullable();

            // Cancellation audit
            $table->dateTime('cancelled_at')->nullable();
            $table->enum('cancelled_by', ['customer', 'tenant'])->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Tenant scoping + common filter patterns
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'starts_at']);
            $table->index(['resource_id', 'starts_at', 'status']);

            // DB-level double-booking guard for slot resources
            // Not enforced for capacity > 1 resources — application handles headcount
            $table->unique(['resource_id', 'starts_at', 'ends_at'], 'no_double_book');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
