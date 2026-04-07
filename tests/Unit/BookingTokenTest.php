<?php

namespace Tests\Unit;

use App\Models\Booking;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BookingTokenTest extends TestCase
{
    #[Test]
    public function token_is_64_hex_characters(): void
    {
        $token = Booking::generateToken();

        $this->assertSame(64, strlen($token));
        $this->assertTrue(ctype_xdigit($token));
    }

    #[Test]
    public function tokens_are_unique_across_many_calls(): void
    {
        $tokens = array_map(fn () => Booking::generateToken(), range(1, 100));

        $this->assertCount(100, array_unique($tokens));
    }
}
