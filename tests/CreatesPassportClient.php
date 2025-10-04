<?php

namespace Tests;

use Laravel\Passport\Client;

trait CreatesPassportClient
{
    /**
     * Setup Passport OAuth client for testing
     *
     * Note: This trait should be used alongside RefreshDatabase trait
     * RefreshDatabase handles migrations automatically
     */
    protected function setUpPassportClient(): void
    {
        // Create OAuth client if it doesn't exist
        if (! Client::where('name', 'Laravel Personal Access Client')->exists()) {
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
}
