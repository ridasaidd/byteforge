<?php

namespace Tests\Unit\Actions\Api\Auth;

use App\Actions\Api\Auth\RefreshAction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\CreatesPassportClient;
use Tests\TestCase;

class RefreshActionTest extends TestCase
{
    use RefreshDatabase, CreatesPassportClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpPassportClient();
    }

    #[Test]
    public function it_revokes_old_token_and_creates_new_one()
    {
        $user = User::factory()->create();
        $oldTokenResult = $user->createToken('old-token');
        $oldToken = $oldTokenResult->token;

        // Create an AccessToken instance for the current token
        $accessToken = new \Laravel\Passport\AccessToken([
            'oauth_access_token_id' => $oldToken->id,
            'oauth_client_id' => $oldToken->client_id,
            'oauth_user_id' => $oldToken->user_id,
            'oauth_scopes' => $oldToken->scopes,
        ]);

        // Set the current access token for the user
        $user->withAccessToken($accessToken);

        // Get initial token count
        $initialTokenCount = $user->tokens()->count();

        $action = new RefreshAction();
        $result = $action->execute($user);

        $this->assertArrayHasKey('token', $result);
        $this->assertIsString($result['token']);

        // Should have one more token (old revoked, new created)
        $user->refresh();
        $this->assertEquals($initialTokenCount + 1, $user->tokens()->count());

        // Old token should be revoked
        $oldToken->refresh();
        $this->assertTrue($oldToken->revoked);

        // Should have one active token
        $this->assertEquals(1, $user->tokens()->where('revoked', false)->count());
    }
}
