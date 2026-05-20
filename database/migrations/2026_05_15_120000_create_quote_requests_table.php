<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_requests', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('requested_booking_service_id')->nullable()->constrained('booking_services')->nullOnDelete();
            $table->string('origin_surface', 40);
            $table->string('guest_name', 120);
            $table->string('guest_email', 255);
            $table->string('guest_phone', 40)->nullable();
            $table->string('subject_label', 160)->nullable();
            $table->text('request_description');
            $table->timestamp('preferred_start_at')->nullable();
            $table->timestamp('preferred_end_at')->nullable();
            $table->string('status', 40)->index();
            $table->timestamp('submitted_at')->nullable()->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_requests');
    }
};
