<?php

namespace Tests;

use Laravel\Passport\Client;

trait CreatesPassportClient
{
    protected function setUpPassportClient(): void
    {
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
