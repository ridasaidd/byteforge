<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_resource_services', function (Blueprint $table) {
            $table->foreignId('resource_id')->constrained('booking_resources')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('booking_services')->cascadeOnDelete();
            $table->primary(['resource_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_resource_services');
    }
};
