<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->foreignId('guest_user_id')->nullable()->after('resource_id')->constrained('guest_users')->nullOnDelete();
            $table->index(['tenant_id', 'guest_user_id', 'starts_at'], 'bookings_tenant_guest_starts_index');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropIndex('bookings_tenant_guest_starts_index');
            $table->dropForeign(['guest_user_id']);
            $table->dropColumn('guest_user_id');
        });
    }
};
