<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_resources', function (Blueprint $table) {
            $table->string('checkin_time', 8)->nullable()->after('description');
            $table->string('checkout_time', 8)->nullable()->after('checkin_time');
        });
    }

    public function down(): void
    {
        Schema::table('booking_resources', function (Blueprint $table) {
            $table->dropColumn(['checkin_time', 'checkout_time']);
        });
    }
};
