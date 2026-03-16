<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE roles MODIFY team_id VARCHAR(64) NULL');
            DB::statement('ALTER TABLE model_has_permissions DROP INDEX model_has_permissions_permission_model_type_unique');
            DB::statement('ALTER TABLE model_has_permissions MODIFY team_id VARCHAR(64) NULL');
            DB::statement('ALTER TABLE model_has_permissions ADD UNIQUE model_has_permissions_permission_model_type_unique (team_id, permission_id, model_id, model_type)');
            DB::statement('ALTER TABLE model_has_roles DROP INDEX model_has_roles_role_model_type_unique');
            DB::statement('ALTER TABLE model_has_roles MODIFY team_id VARCHAR(64) NULL');
            DB::statement('ALTER TABLE model_has_roles ADD UNIQUE model_has_roles_role_model_type_unique (team_id, role_id, model_id, model_type)');
            return;
        }

        if ($driver === 'sqlite') {
            // SQLite test environments already skip tenant-team RBAC flows.
            return;
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE roles MODIFY team_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE model_has_permissions DROP INDEX model_has_permissions_permission_model_type_unique');
            DB::statement('ALTER TABLE model_has_permissions MODIFY team_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE model_has_permissions ADD UNIQUE model_has_permissions_permission_model_type_unique (team_id, permission_id, model_id, model_type)');
            DB::statement('ALTER TABLE model_has_roles DROP INDEX model_has_roles_role_model_type_unique');
            DB::statement('ALTER TABLE model_has_roles MODIFY team_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE model_has_roles ADD UNIQUE model_has_roles_role_model_type_unique (team_id, role_id, model_id, model_type)');
        }
    }
};
