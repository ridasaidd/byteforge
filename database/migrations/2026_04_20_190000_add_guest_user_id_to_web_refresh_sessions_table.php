<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('web_refresh_sessions', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreignId('guest_user_id')->nullable()->after('user_id')->constrained('guest_users')->cascadeOnDelete();
        });

        Schema::table('web_refresh_sessions', function (Blueprint $table): void {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['guest_user_id', 'host']);
        });

        $this->addActorCheckConstraint();
    }

    public function down(): void
    {
        $this->dropActorCheckConstraint();

        Schema::table('web_refresh_sessions', function (Blueprint $table): void {
            $table->dropIndex('web_refresh_sessions_guest_user_id_host_index');
            $table->dropForeign(['guest_user_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn('guest_user_id');
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });

        Schema::table('web_refresh_sessions', function (Blueprint $table): void {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    private function addActorCheckConstraint(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement(
            'ALTER TABLE web_refresh_sessions ADD CONSTRAINT web_refresh_sessions_actor_check CHECK ((user_id IS NOT NULL AND guest_user_id IS NULL) OR (user_id IS NULL AND guest_user_id IS NOT NULL))'
        );
    }

    private function dropActorCheckConstraint(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE web_refresh_sessions DROP CONSTRAINT web_refresh_sessions_actor_check');
    }
};
