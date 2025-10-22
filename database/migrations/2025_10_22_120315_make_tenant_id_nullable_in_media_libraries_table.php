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
        Schema::table('media_libraries', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['tenant_id']);

            // Make tenant_id nullable to support central context
            $table->string('tenant_id')->nullable()->change();

            // Re-add foreign key with nullable support
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media_libraries', function (Blueprint $table) {
            // Drop foreign key
            $table->dropForeign(['tenant_id']);

            // Make tenant_id NOT NULL again
            $table->string('tenant_id')->nullable(false)->change();

            // Re-add foreign key
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });
    }
};
