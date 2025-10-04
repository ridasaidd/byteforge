<?php

namespace Tests\Unit\Actions\Api\Auth;

use App\Actions\Api\Auth\LogoutAction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class LogoutActionTest extends TestCase
{
    use RefreshDatabase, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function it_revokes_user_token()
    {
        $user = User::factory()->create();
        $tokenResult = $user->createToken('test-token');
        $token = $tokenResult->token;

        // Create an AccessToken instance for the current token
        $accessToken = new \Laravel\Passport\AccessToken([
            'oauth_access_token_id' => $token->id,
            'oauth_client_id' => $token->client_id,
            'oauth_user_id' => $token->user_id,
            'oauth_scopes' => $token->scopes,
        ]);

        // Set the current access token for the user
        $user->withAccessToken($accessToken);

        // Verify token exists and is not revoked
        $this->assertCount(1, $user->tokens);
        $this->assertFalse($user->tokens->first()->revoked);

        $action = new LogoutAction();
        $action->execute($user);

        // Token should be revoked
        $user->refresh();
        $this->assertTrue($user->tokens->first()->revoked);
    }
}
