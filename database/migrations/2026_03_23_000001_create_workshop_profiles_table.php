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
        Schema::create('workshop_profiles', function (Blueprint $table) {
            $table->id();

            // Tenant reference (one-to-one: each mechanic tenant has one profile)
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique('tenant_id');

            // Display information
            $table->string('display_name');
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();

            // Contact details
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();

            // Physical location
            $table->string('address');
            $table->string('city');
            $table->string('state')->nullable();
            $table->string('country', 2)->default('SE');
            $table->string('postal_code')->nullable();

            // Geolocation (decimal with 7 decimal places supports ~1 cm precision)
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->index(['latitude', 'longitude']);

            // Services offered — array of specialization slugs
            // e.g. ["engine_repair","brakes","tires","bodywork","electrical","ac_service","oil_change"]
            $table->json('specializations')->nullable();

            // Opening hours — keyed by ISO weekday abbreviation (mon–sun)
            // e.g. {"mon":{"open":"08:00","close":"17:00"},"sat":null}
            $table->json('opening_hours')->nullable();

            // Directory listing controls
            $table->boolean('is_listed')->default(false)->index();
            $table->boolean('is_verified')->default(false);

            // Aggregated review stats (denormalised for fast search queries)
            $table->decimal('rating_avg', 3, 2)->nullable();
            $table->unsignedInteger('review_count')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workshop_profiles');
    }
};
