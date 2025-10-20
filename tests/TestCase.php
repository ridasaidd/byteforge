<?php

namespace Tests;

use Database\Seeders\PassportTestSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Seed Passport personal access client for tests
        $this->seed(PassportTestSeeder::class);
    }
}
