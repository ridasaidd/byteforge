<?php

namespace App\Actions\Central\Tenants;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Membership;

class RemoveUserFromTenant
{
    use AsAction;

    public function handle(Tenant $tenant, User $user): bool
    {
        $membership = Membership::where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return false;
        }

        return $membership->delete();
    }
}
