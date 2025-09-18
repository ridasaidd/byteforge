<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Stancl\Tenancy\Database\Models\Domain;
use App\Models\Tenant;

class DomainSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Tenant::all() as $tenant) {
            Domain::create([
                'domain' => $tenant->slug . '.byteforge.se',
                'tenant_id' => $tenant->id,
            ]);
        }
    }
}
