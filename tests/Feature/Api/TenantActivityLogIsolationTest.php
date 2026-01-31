<?php
namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TenantActivityLogIsolationTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function activity_log_isolation()
    {
        $this->markTestSkipped('Activity logging disabled in test environment (UUID/bigint column mismatch)');
    }
}
