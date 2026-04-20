<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\TenantSupportAccessService;
use Illuminate\Console\Command;

class ExpireTenantSupportAccess extends Command
{
    protected $signature = 'support-access:expire';

    protected $description = 'Expire temporary support access grants whose access window has elapsed';

    public function __construct(
        private readonly TenantSupportAccessService $tenantSupportAccess,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $expiredCount = $this->tenantSupportAccess->expireActiveGrants();

        $this->info("Expired {$expiredCount} support grant(s).");

        return self::SUCCESS;
    }
}
