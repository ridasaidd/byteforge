<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::all();
        $users = User::all();
        foreach ($tenants as $tenant) {
            // Assign random user as creator
            $creator = $users->random();
            Page::factory()->count(5)->create([
                'tenant_id' => $tenant->id,
                'created_by' => $creator->id,
            ]);
        }
    }
}
