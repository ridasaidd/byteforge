<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table): void {
            $table->foreignId('guest_user_id')->nullable()->after('requested_booking_service_id')->constrained('guest_users')->nullOnDelete();
            $table->index(['tenant_id', 'guest_user_id', 'submitted_at'], 'quote_requests_tenant_guest_submitted_index');
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table): void {
            $table->dropIndex('quote_requests_tenant_guest_submitted_index');
            $table->dropForeign(['guest_user_id']);
            $table->dropColumn('guest_user_id');
        });
    }
};