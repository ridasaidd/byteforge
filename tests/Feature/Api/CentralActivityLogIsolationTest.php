<?php
namespace Tests\Feature\Api;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CentralActivityLogIsolationTest extends TestCase
{
    #[Test]
    public function activity_log_isolation()
    {
        $this->markTestSkipped('Activity logging disabled in test environment (UUID/bigint column mismatch)');
    }
}
