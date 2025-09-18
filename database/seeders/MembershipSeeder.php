<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Membership;
use App\Models\User;
use App\Models\Tenant;

class MembershipSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::all();
        $tenantUsers = User::where('type', 'tenant_user')->get();
        $customers = User::where('type', 'customer')->get();

        // Assign tenant users as owners or staff
        foreach ($tenantUsers as $user) {
            $tenant = $tenants->random();
            Membership::create([
                'user_id' => $user->id,
                'tenant_id' => $tenant->id,
                'role' => fake()->randomElement(['owner', 'staff']),
                'status' => 'active',
            ]);
        }

        // Assign customers to random tenants
        foreach ($customers as $user) {
            $tenant = $tenants->random();
            Membership::create([
                'user_id' => $user->id,
                'tenant_id' => $tenant->id,
                'role' => 'customer',
                'status' => 'active',
            ]);
        }
    }
}
