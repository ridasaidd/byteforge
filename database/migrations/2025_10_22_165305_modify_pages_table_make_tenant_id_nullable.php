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
        Schema::table('pages', function (Blueprint $table) {
            // Drop the foreign key constraint
            $table->dropForeign(['tenant_id']);

            // Make tenant_id nullable
            $table->string('tenant_id')->nullable()->change();

            // Re-add foreign key but allow null
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
        Schema::table('pages', function (Blueprint $table) {
            // Drop the modified foreign key
            $table->dropForeign(['tenant_id']);

            // Make tenant_id non-nullable again
            $table->string('tenant_id')->nullable(false)->change();

            // Re-add original foreign key
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });
    }
};
