<?php

namespace Tests\Unit\Actions\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NormalizeInputFieldsActionTest extends TestCase
{
    #[Test]
    public function it_normalizes_only_explicit_single_line_fields(): void
    {
        $result = app(NormalizeInputFieldsAction::class)([
            'customer_name' => "  <b>Jane\n Doe</b> \t",
            'token' => " raw\nvalue ",
        ], singleLineFields: ['customer_name']);

        $this->assertSame('Jane Doe', $result['customer_name']);
        $this->assertSame(" raw\nvalue ", $result['token']);
    }

    #[Test]
    public function it_normalizes_multiline_fields_without_collapsing_newlines(): void
    {
        $result = app(NormalizeInputFieldsAction::class)([
            'notes' => " <b>Hello</b>\r\nTeam\x07 ",
        ], multilineFields: ['notes']);

        $this->assertSame("Hello\nTeam", $result['notes']);
    }
}
