<?php

namespace Tests\Unit\Actions;

use App\Actions\Api\ValidateProviderCredentialsAction;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ValidateProviderCredentialsTest extends TestCase
{
    private ValidateProviderCredentialsAction $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = app(ValidateProviderCredentialsAction::class);
    }

    #[Test]
    public function stripe_validation_rejects_invalid_prefixes(): void
    {
        $result = $this->action->handle('stripe', [
            'publishable_key' => 'invalid_pk',
            'secret_key' => 'invalid_sk',
        ]);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('publishable_key', $result['errors']);
        $this->assertArrayHasKey('secret_key', $result['errors']);
    }

    #[Test]
    public function swish_validation_rejects_invalid_merchant_number_format(): void
    {
        $result = $this->action->handle('swish', [
            'merchant_swish_number' => '0701234567',
            'certificate' => 'cert',
            'private_key' => 'key',
            'ca_certificate' => 'ca',
        ]);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('merchant_swish_number', $result['errors']);
    }

    #[Test]
    public function klarna_validation_rejects_empty_username_and_password(): void
    {
        $result = $this->action->handle('klarna', [
            'username' => '',
            'password' => '',
        ]);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('username', $result['errors']);
        $this->assertArrayHasKey('password', $result['errors']);
    }

    #[Test]
    public function valid_stripe_keys_pass_validation(): void
    {
        $result = $this->action->handle('stripe', [
            'publishable_key' => 'pk_test_1234567890abc',
            'secret_key' => 'sk_test_1234567890xyz',
        ]);

        $this->assertTrue($result['valid']);
        $this->assertSame([], $result['errors']);
    }
}
