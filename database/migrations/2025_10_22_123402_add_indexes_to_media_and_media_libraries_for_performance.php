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
        // Add composite index for media filtering by model and collection
        Schema::table('media', function (Blueprint $table) {
            // Index for filtering media by model type and collection (used in media library queries)
            $table->index(['model_type', 'model_id', 'collection_name'], 'media_model_collection_index');

            // Index for tenant + collection filtering
            $table->index(['tenant_id', 'collection_name'], 'media_tenant_collection_index');
        });

        // Add index for folder filtering in media_libraries
        Schema::table('media_libraries', function (Blueprint $table) {
            // Composite index for tenant + folder queries
            $table->index(['tenant_id', 'folder_id'], 'media_libraries_tenant_folder_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropIndex('media_model_collection_index');
            $table->dropIndex('media_tenant_collection_index');
        });

        Schema::table('media_libraries', function (Blueprint $table) {
            $table->dropIndex('media_libraries_tenant_folder_index');
        });
    }
};
