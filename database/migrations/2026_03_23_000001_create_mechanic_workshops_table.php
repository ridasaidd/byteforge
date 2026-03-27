<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mechanic_workshops', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();

            // Location
            $table->string('address');
            $table->string('city');
            $table->string('state')->nullable();
            $table->string('country', 2)->default('SE');
            $table->string('postal_code', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Contact
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();

            // Meta
            $table->string('status')->default('active'); // active, inactive, pending
            $table->unsignedDecimal('rating_average', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'latitude', 'longitude']);
            $table->index(['tenant_id', 'city']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mechanic_workshops');
    }
};
