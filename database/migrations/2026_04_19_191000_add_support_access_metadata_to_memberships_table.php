<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->string('source')->nullable()->after('status');
            $table->timestamp('expires_at')->nullable()->after('source');
            $table->index(['tenant_id', 'source', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'source', 'status']);
            $table->dropColumn(['source', 'expires_at']);
        });
    }
};
