<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_services', function (Blueprint $table) {
            $table->string('customer_flow', 32)
                ->default('direct_booking')
                ->after('booking_mode');

            $table->index(['tenant_id', 'customer_flow']);
        });
    }

    public function down(): void
    {
        Schema::table('booking_services', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'customer_flow']);
            $table->dropColumn('customer_flow');
        });
    }
};
