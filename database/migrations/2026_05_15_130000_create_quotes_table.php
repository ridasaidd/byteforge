<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('quote_request_id')->constrained('quote_requests')->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('booking_service_id')->nullable()->constrained('booking_services')->nullOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sent_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->char('currency', 3)->default('SEK');
            $table->integer('subtotal_minor');
            $table->integer('tax_minor')->nullable();
            $table->integer('total_minor');
            $table->unsignedInteger('estimated_duration_minutes')->nullable();
            $table->text('customer_message')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->string('public_token_hash', 64)->nullable()->unique();
            $table->string('status', 40)->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();

            $table->unique(['quote_request_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
