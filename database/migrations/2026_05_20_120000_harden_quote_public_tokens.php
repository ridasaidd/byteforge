<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $addedHashColumn = false;

        if (! Schema::hasColumn('quotes', 'public_token_hash')) {
            Schema::table('quotes', function (Blueprint $table): void {
                $table->string('public_token_hash', 64)->nullable()->after('valid_until');
            });

            $addedHashColumn = true;
        }

        if (! Schema::hasColumn('quotes', 'public_token')) {
            return;
        }

        DB::table('quotes')
            ->select(['id', 'public_token'])
            ->orderBy('id')
            ->chunkById(100, function ($quotes): void {
                foreach ($quotes as $quote) {
                    if (! is_string($quote->public_token) || $quote->public_token === '') {
                        continue;
                    }

                    DB::table('quotes')
                        ->where('id', $quote->id)
                        ->update([
                            'public_token_hash' => hash('sha256', $quote->public_token),
                        ]);
                }
            });

        Schema::table('quotes', function (Blueprint $table) use ($addedHashColumn): void {
            if ($addedHashColumn) {
                $table->unique('public_token_hash');
            }

            $table->dropUnique(['public_token']);
            $table->dropColumn('public_token');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('quotes', 'public_token')) {
            Schema::table('quotes', function (Blueprint $table): void {
                $table->string('public_token', 64)->nullable()->after('valid_until');
            });
        }

        if (! Schema::hasColumn('quotes', 'public_token_hash')) {
            return;
        }

        Schema::table('quotes', function (Blueprint $table): void {
            $table->dropUnique(['public_token_hash']);
            $table->dropColumn('public_token_hash');
        });
    }
};
