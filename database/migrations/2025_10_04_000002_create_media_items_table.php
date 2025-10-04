<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_items', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->nullable();
            $table->unsignedBigInteger('folder_id')->nullable();
            $table->string('title')->nullable();
            $table->text('alt_text')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('tenant_id');
            $table->index('folder_id');

            // Foreign key
            $table->foreign('folder_id')
                ->references('id')
                ->on('media_folders')
                ->onDelete('set null');
        });

        // Add folder_id to existing media table if it exists
        if (Schema::hasTable('media') && !Schema::hasColumn('media', 'folder_id')) {
            Schema::table('media', function (Blueprint $table) {
                $table->unsignedBigInteger('folder_id')->nullable()->after('id');
                $table->string('tenant_id')->nullable()->after('folder_id');

                $table->index('tenant_id');
                $table->index('folder_id');

                $table->foreign('folder_id')
                    ->references('id')
                    ->on('media_folders')
                    ->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        // Remove columns from media table if they exist
        if (Schema::hasTable('media')) {
            Schema::table('media', function (Blueprint $table) {
                $table->dropForeign(['folder_id']);
                $table->dropIndex(['folder_id']);
                $table->dropIndex(['tenant_id']);
                $table->dropColumn(['folder_id', 'tenant_id']);
            });
        }

        Schema::dropIfExists('media_items');
    }
};
