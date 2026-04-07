<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_resources', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name', 120);
            $table->enum('type', ['person', 'space', 'equipment']);
            $table->unsignedTinyInteger('capacity')->default(1);
            $table->string('resource_label', 60)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_resources');
    }
};
