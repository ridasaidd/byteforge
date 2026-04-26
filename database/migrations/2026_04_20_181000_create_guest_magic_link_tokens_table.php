<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_magic_link_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('guest_user_id')->constrained()->cascadeOnDelete();
            $table->string('tenant_id');
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['guest_user_id', 'tenant_id']);
            $table->index(['tenant_id', 'expires_at', 'used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_magic_link_tokens');
    }
};
