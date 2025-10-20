<?php

namespace Database\Seeders;

use App\Models\Navigation;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class NavigationSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::all();
        $users = User::all();
        foreach ($tenants as $tenant) {
            // Assign random user as creator
            $creator = $users->random();
            Navigation::factory()->count(2)->create([
                'tenant_id' => $tenant->id,
                'created_by' => $creator->id,
            ]);
        }
    }
}
