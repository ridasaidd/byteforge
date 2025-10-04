<?php

namespace Tests;

use Laravel\Passport\Client;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

trait CreatesPassportClient
{
    protected function setUpPassportClient(): void
    {
        // Ensure Passport migrations are present in the test database
        if (! Schema::hasTable('oauth_clients')) {
            // Run migrations once with --path filter to avoid re-running all migrations
            Artisan::call('migrate', [
                '--path' => 'vendor/laravel/passport/database/migrations',
                '--realpath' => true,
                '--force' => true
            ]);
        }

        $client = new Client([
            'name' => 'Laravel Personal Access Client',
            'secret' => 'secret',
            'provider' => 'users',
            'redirect_uris' => ['http://localhost'],
            'grant_types' => ['personal_access'],
            'revoked' => false,
        ]);
        $client->save();
    }
}
