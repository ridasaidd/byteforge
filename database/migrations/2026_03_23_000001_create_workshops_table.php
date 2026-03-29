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
        Schema::create('workshops', function (Blueprint $table) {
            $table->id();

            // Tenant scoping (single shared database — each tenant is isolated by this column)
            $table->string('tenant_id')->nullable()->index();

            // Owner — the mechanic user who manages this workshop
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Core details
            $table->string('name');
            $table->text('description')->nullable();

            // Contact
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();

            // Address
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 2)->default('SE');

            // Geolocation (WGS-84 decimal degrees, ~1 cm precision)
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Specialisations and hours stored as JSON for flexibility
            $table->json('specializations')->nullable();
            $table->json('opening_hours')->nullable();

            // Status flags
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);

            $table->timestamps();

            // Composite index for tenant + location queries
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workshops');
    }
};
