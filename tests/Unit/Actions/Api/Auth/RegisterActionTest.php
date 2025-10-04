<?php

namespace Tests\Unit\Actions\Api\Auth;

use App\Actions\Api\Auth\RegisterAction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class RegisterActionTest extends TestCase
{
    use RefreshDatabase, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function it_registers_user_with_valid_data()
    {
        $action = new RegisterAction();
        $result = $action->execute([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'type' => 'customer',
        ]);

        $this->assertInstanceOf(User::class, $result['user']);
        $this->assertEquals('Test User', $result['user']->name);
        $this->assertEquals('test@example.com', $result['user']->email);
        $this->assertEquals('customer', $result['user']->type);
        $this->assertArrayHasKey('token', $result);
        $this->assertIsString($result['token']);

        $this->assertDatabaseHas('users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'type' => 'customer',
        ]);
    }

    #[Test]
    public function it_defaults_to_customer_type_when_not_provided()
    {
        $action = new RegisterAction();
        $result = $action->execute([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $this->assertEquals('customer', $result['user']->type);
    }
}
