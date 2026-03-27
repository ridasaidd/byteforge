<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanic_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workshop_id')->constrained('mechanic_workshops')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating'); // 1–5
            $table->string('title')->nullable();
            $table->text('comment')->nullable();
            $table->string('status')->default('published'); // published, pending, rejected
            $table->timestamps();

            $table->unique(['workshop_id', 'reviewer_user_id']);
            $table->index(['workshop_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanic_reviews');
    }
};
