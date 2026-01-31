<?php

/**
 * PHPUnit Bootstrap File
 *
 * This file runs ONCE before any tests execute.
 * We use it to ensure test fixtures (users, tenants) exist in the database.
 *
 * These fixtures persist across all tests because they're created
 * BEFORE the DatabaseTransactions trait starts its transaction.
 */

require __DIR__.'/../vendor/autoload.php';

// Boot the Laravel application
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Disable activity logging in tests to avoid UUID/bigint column mismatch
// (tenant IDs are UUIDs but activity_log.subject_id is bigint)
\Spatie\Activitylog\Facades\Activity::disableLogging();

// Ensure test fixtures exist (users, tenants, roles)
// This runs outside of any test transaction, so it persists!
$superadminExists = \App\Models\User::where('email', 'superadmin@byteforge.se')->exists();

if (!$superadminExists) {
    echo "\n🌱 Seeding test fixtures (users, tenants, roles)...\n";

    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'TestFixturesSeeder',
        '--force' => true,
    ]);

    echo \Illuminate\Support\Facades\Artisan::output();
    echo "✅ Test fixtures ready!\n\n";
} else {
    echo "\n✅ Test fixtures already exist.\n\n";
}
