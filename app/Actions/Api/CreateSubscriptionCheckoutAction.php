<?php

namespace App\Actions\Api;

use App\Models\Plan;
use App\Models\Tenant;
use App\Services\BillingService;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateSubscriptionCheckoutAction
{
    use AsAction;

    public function handle(Tenant $tenant, Plan $plan, string $successUrl, string $cancelUrl): array
    {
        return app(BillingService::class)->createCheckout($tenant, $plan, $successUrl, $cancelUrl);
    }
}
