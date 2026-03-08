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
        Schema::create('tenant_payment_providers', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('provider', 50);
            $table->longText('credentials');
            $table->boolean('is_active')->default(false);
            $table->string('mode', 10)->default('test');
            $table->longText('webhook_secret')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'provider']);
            $table->index(['tenant_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_payment_providers');
    }
};
