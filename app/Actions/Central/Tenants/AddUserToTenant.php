<?php

namespace App\Actions\Central\Tenants;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Membership;

class AddUserToTenant
{
    use AsAction;

    public function handle(Tenant $tenant, User $user, array $data): Membership
    {
        // Check if membership already exists
        $existing = Membership::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            // Update existing membership
            $existing->update([
                'role' => $data['role'] ?? $existing->role,
                'status' => $data['status'] ?? $existing->status,
            ]);
            return $existing->fresh();
        }

        // Create new membership
        $membership = Membership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $data['role'] ?? 'member',
            'status' => $data['status'] ?? 'active',
        ]);

        return $membership;
    }
}
