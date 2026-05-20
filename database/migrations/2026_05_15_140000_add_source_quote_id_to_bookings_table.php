<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->foreignId('source_quote_id')
                ->nullable()
                ->after('payment_id')
                ->constrained('quotes')
                ->nullOnDelete();

            $table->index(['tenant_id', 'source_quote_id']);
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'source_quote_id']);
            $table->dropConstrainedForeignId('source_quote_id');
        });
    }
};
