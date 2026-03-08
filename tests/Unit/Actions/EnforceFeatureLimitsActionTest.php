<?php

namespace Tests\Unit\Actions;

use App\Actions\Api\EnforceFeatureLimitsAction;
use App\Models\Plan;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EnforceFeatureLimitsActionTest extends TestCase
{
    #[Test]
    public function it_allows_usage_within_plan_limits(): void
    {
        $plan = Plan::query()->updateOrCreate(
            ['slug' => 'limits-allow-plan'],
            [
                'name' => 'Limits Allow Plan',
                'price_monthly' => 1000,
                'price_yearly' => 10000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 10, 'max_media_mb' => 1000, 'max_users' => 5],
                'is_active' => true,
                'sort_order' => 70,
            ]
        );

        $result = EnforceFeatureLimitsAction::run($plan, [
            'max_pages' => 8,
            'max_media_mb' => 900,
            'max_users' => 5,
        ]);

        $this->assertTrue($result['allowed']);
        $this->assertCount(0, $result['violations']);
    }

    #[Test]
    public function it_reports_violations_when_usage_exceeds_limits(): void
    {
        $plan = Plan::query()->updateOrCreate(
            ['slug' => 'limits-block-plan'],
            [
                'name' => 'Limits Block Plan',
                'price_monthly' => 1000,
                'price_yearly' => 10000,
                'currency' => 'SEK',
                'limits' => ['max_pages' => 3, 'max_media_mb' => 500, 'max_users' => 2],
                'is_active' => true,
                'sort_order' => 71,
            ]
        );

        $result = EnforceFeatureLimitsAction::run($plan, [
            'max_pages' => 4,
            'max_media_mb' => 500,
            'max_users' => 3,
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertCount(2, $result['violations']);

        $keys = array_map(static fn (array $v) => $v['key'], $result['violations']);
        $this->assertContains('max_pages', $keys);
        $this->assertContains('max_users', $keys);
    }
}
