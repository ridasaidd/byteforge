<?php

namespace Tests\Unit\Actions\Api\Auth;

use App\Actions\Api\Auth\LoginAction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class LoginActionTest extends TestCase
{
    use RefreshDatabase, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function it_logs_in_user_with_valid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $action = new LoginAction();
        $result = $action->execute([
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $this->assertEquals($user->id, $result['user']->id);
        $this->assertArrayHasKey('token', $result);
        $this->assertIsString($result['token']);
    }

    #[Test]
    public function it_throws_validation_exception_with_invalid_credentials()
    {
        $this->expectException(ValidationException::class);

        $action = new LoginAction();
        $action->execute([
            'email' => 'nonexistent@example.com',
            'password' => 'wrongpassword',
        ]);
    }

    #[Test]
    public function it_throws_validation_exception_with_wrong_password()
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->expectException(ValidationException::class);

        $action = new LoginAction();
        $action->execute([
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);
    }
}
