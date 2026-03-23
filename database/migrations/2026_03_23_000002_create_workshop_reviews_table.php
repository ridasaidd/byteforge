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
        Schema::create('workshop_reviews', function (Blueprint $table) {
            $table->id();

            $table->foreignId('workshop_profile_id')
                ->constrained('workshop_profiles')
                ->cascadeOnDelete();

            // The customer leaving the review (central user)
            $table->foreignId('reviewer_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // One review per customer per workshop
            $table->unique(['workshop_profile_id', 'reviewer_user_id']);

            $table->unsignedTinyInteger('rating'); // 1–5
            $table->text('comment')->nullable();

            // Set to true once the reviewer can be confirmed as a paying customer
            $table->boolean('is_verified')->default(false);

            $table->timestamps();

            $table->index('workshop_profile_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workshop_reviews');
    }
};
