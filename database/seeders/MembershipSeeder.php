<?php

namespace Database\Seeders;

use App\Models\Membership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class MembershipSeeder extends Seeder
{
    public function run(): void
    {
        // Get only non-fixed tenants and users for random membership creation
        $tenants = Tenant::whereNotIn('id', ['tenant_one', 'tenant_two', 'tenant_three'])->get();
        $tenantUsers = User::where('type', 'tenant_user')
            ->whereNotIn('email', ['user.multiple@byteforge.test', 'user.single@byteforge.test'])
            ->get();
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
