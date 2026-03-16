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
        Schema::table('page_templates', function (Blueprint $table) {
            // Drop the global unique constraint on slug alone.
            $table->dropUnique(['slug']);

            // Replace with a composite unique constraint: (tenant_id, slug).
            // NULL tenant_id rows (system templates) are still effectively unique
            // in MySQL because NULLs are not considered equal in unique indexes,
            // so multiple tenants can each have a template with the same slug.
            $table->unique(['tenant_id', 'slug'], 'page_templates_tenant_slug_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('page_templates', function (Blueprint $table) {
            $table->dropUnique('page_templates_tenant_slug_unique');
            $table->unique('slug');
        });
    }
};
