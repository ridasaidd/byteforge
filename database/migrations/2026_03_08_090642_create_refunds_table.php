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
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->string('provider_refund_id')->nullable();
            $table->integer('amount');
            $table->string('reason')->nullable();
            $table->string('status', 30)->default('pending');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
