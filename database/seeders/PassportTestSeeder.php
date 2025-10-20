<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Laravel\Passport\Client;

class PassportTestSeeder extends Seeder
{
    /**
     * Run the database seeds for Passport personal access client.
     * This seeder is used by tests to create the required OAuth client.
     */
    public function run(): void
    {
        // Check if personal access client already exists
        $exists = Client::where('grant_types', 'like', '%personal_access%')->exists();

        if (! $exists) {
            // Create personal access client
            // The Client model will automatically handle JSON encoding for grant_types and redirect_uris
            Client::create([
                'name' => 'Test Personal Access Client',
                'secret' => \Illuminate\Support\Str::random(40),
                'redirect_uris' => ['http://byteforge.se'],
                'grant_types' => ['personal_access'],
                'revoked' => false,
                'provider' => 'users',
            ]);
        }
    }
}
