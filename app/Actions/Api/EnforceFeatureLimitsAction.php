<?php

namespace App\Actions\Api;

use App\Models\Plan;
use Lorisleiva\Actions\Concerns\AsAction;

class EnforceFeatureLimitsAction
{
    use AsAction;

    /**
     * @param array<string, int|bool> $usage
     */
    public function handle(Plan $plan, array $usage): array
    {
        $limits = is_array($plan->limits) ? $plan->limits : [];

        $violations = [];
        foreach (['max_pages', 'max_media_mb', 'max_users'] as $key) {
            if (!array_key_exists($key, $limits)) {
                continue;
            }

            $current = (int) ($usage[$key] ?? 0);
            $limit = (int) $limits[$key];

            if ($current > $limit) {
                $violations[] = [
                    'key' => $key,
                    'current' => $current,
                    'limit' => $limit,
                ];
            }
        }

        return [
            'allowed' => empty($violations),
            'violations' => $violations,
            'limits' => $limits,
        ];
    }
}
