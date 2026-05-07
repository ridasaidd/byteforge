<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanic_profiles', function (Blueprint $table) {
            $table->id();

            // Tenant that owns this mechanic profile (each mechanic workshop = one tenant)
            $table->string('tenant_id', 255)->unique()->index();

            // Location data
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Contact
            $table->string('phone', 50)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('website', 255)->nullable();

            // Workshop details
            $table->text('description')->nullable();
            $table->json('services')->nullable(); // e.g. ["oil change", "brake repair", "diagnostics"]
            $table->json('business_hours')->nullable(); // { "monday": {"open": "08:00", "close": "17:00"}, ... }

            // Status & trust
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);

            $table->timestamps();

            // Spatial indexes for fast geo-queries
            $table->index(['latitude', 'longitude'], 'idx_mechanic_location');
            $table->index(['city', 'is_active'], 'idx_mechanic_city_active');
            $table->index(['country', 'is_active'], 'idx_mechanic_country_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanic_profiles');
    }
};
