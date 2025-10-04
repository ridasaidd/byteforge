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
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $teamForeignKey = $columnNames['team_foreign_key'] ?? 'team_id';

        // Update roles table to use string for team_foreign_key
        Schema::table($tableNames['roles'], function (Blueprint $table) use ($teamForeignKey) {
            $table->string($teamForeignKey, 255)->nullable()->change();
        });

        // Update model_has_roles table to use string for team_foreign_key
        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($teamForeignKey) {
            $table->string($teamForeignKey, 255)->nullable()->change();
        });

        // Update model_has_permissions table to use string for team_foreign_key
        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($teamForeignKey) {
            $table->string($teamForeignKey, 255)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $teamForeignKey = $columnNames['team_foreign_key'] ?? 'team_id';

        // Revert roles table back to unsignedBigInteger
        Schema::table($tableNames['roles'], function (Blueprint $table) use ($teamForeignKey) {
            $table->unsignedBigInteger($teamForeignKey)->nullable()->change();
        });

        // Revert model_has_roles table back to unsignedBigInteger
        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($teamForeignKey) {
            $table->unsignedBigInteger($teamForeignKey)->nullable()->change();
        });

        // Revert model_has_permissions table back to unsignedBigInteger
        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($teamForeignKey) {
            $table->unsignedBigInteger($teamForeignKey)->nullable()->change();
        });
    }
};
