<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\ThemePlaceholder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ThemePlaceholderApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Theme $theme;

    protected function setUp(): void
    {
        parent::setUp();

        // Permissions/Roles seeded by TestCase -> TestFixturesSeeder

        $this->user = User::factory()->create();
        $this->user->givePermissionTo('themes.manage');

        Passport::actingAs($this->user);

        // Create a theme (Blueprint) - all themes are blueprints in simplified architecture
        $this->theme = Theme::factory()->create([
            'is_system_theme' => true,
            'tenant_id' => null,
            'name' => 'Test Theme',
            'slug' => 'test-theme'
        ]);
    }

    #[Test]
    public function it_can_save_a_placeholder_for_theme()
    {
        $payload = [
            'content' => [
                'root' => [],
                'content' => [['id' => 'comp-1', 'type' => 'Button']]
            ]
        ];

        $response = $this->postJson("/api/superadmin/themes/{$this->theme->id}/placeholders/header", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Header placeholder saved successfully');

        $this->assertDatabaseHas('theme_placeholders', [
            'theme_id' => $this->theme->id,
            'type' => 'header',
        ]);
    }

    #[Test]
    public function it_requires_content_in_payload()
    {
        // Missing content should fail
        $response = $this->postJson("/api/superadmin/themes/{$this->theme->id}/placeholders/header", []);

        $response->assertStatus(422);
    }

    #[Test]
    public function it_updates_existing_placeholder()
    {
        // Create initial placeholder
        $placeholder = ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'footer',
            'content' => ['old' => 'data']
        ]);

        $payload = [
            'content' => ['new' => 'data']
        ];

        $response = $this->postJson("/api/superadmin/themes/{$this->theme->id}/placeholders/footer", $payload);

        $response->assertStatus(200);

        $this->assertDatabaseHas('theme_placeholders', [
            'id' => $placeholder->id,
            'type' => 'footer',
        ]);

        $freshPlaceholder = $placeholder->fresh();
        $this->assertEquals(['new' => 'data'], $freshPlaceholder->content);
    }

    #[Test]
    public function it_can_retrieve_placeholder()
    {
        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'header',
            'content' => ['test' => 'content']
        ]);

        $response = $this->getJson("/api/superadmin/themes/{$this->theme->id}/placeholders/header");

        $response->assertStatus(200)
            ->assertJsonPath('data.content', ['test' => 'content']);
    }

    #[Test]
    public function it_returns_404_if_placeholder_does_not_exist()
    {
        $response = $this->getJson("/api/superadmin/themes/{$this->theme->id}/placeholders/sidebar");

        $response->assertStatus(404);
    }

    #[Test]
    public function it_can_list_all_placeholders_for_theme()
    {
        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'header',
            'content' => ['header' => 'content']
        ]);

        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'footer',
            'content' => ['footer' => 'content']
        ]);

        $response = $this->getJson("/api/superadmin/themes/{$this->theme->id}/placeholders");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }
}
