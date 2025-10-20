<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Stancl\Tenancy\Database\Models\Domain;

class DomainSeeder extends Seeder
{
    public function run(): void
    {
        // Create domains for non-fixed tenants (fixed tenants already have domains)
        foreach (Tenant::whereNotIn('id', ['tenant_one', 'tenant_two', 'tenant_three'])->get() as $tenant) {
            Domain::create([
                'domain' => $tenant->slug.'.byteforge.se',
                'tenant_id' => $tenant->id,
            ]);
        }
    }
}
