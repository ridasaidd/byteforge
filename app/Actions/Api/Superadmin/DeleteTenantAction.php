<?php

namespace App\Actions\Api\Superadmin;

use App\Models\Tenant;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteTenantAction
{
    use AsAction;

    public function handle(Tenant $tenant): void
    {
        $this->execute($tenant);
    }

    public function execute(Tenant $tenant): void
    {
        // Domains will be cascade deleted due to foreign key constraint
        $tenant->delete();
    }
}
