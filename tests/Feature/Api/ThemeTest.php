<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;


class ThemeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure permission exists for tests
        \Spatie\Permission\Models\Permission::findOrCreate('sync themes', 'api');
        $user = User::factory()->create();
        Passport::actingAs($user);
    }

    public function test_user_without_permission_cannot_sync_themes()
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $response = $this->postJson('/api/superadmin/themes/sync');
        $response->assertStatus(403);
    }

    public function test_user_with_permission_can_sync_themes()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('sync themes');
        Passport::actingAs($user);

        Theme::query()->delete();

        $response = $this->postJson('/api/superadmin/themes/sync');
        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Themes synced successfully.']);
    }

    #[Test]
    public function superadmin_can_sync_themes_from_disk()
    {
        // Ensure no themes in DB
        Theme::query()->delete();

        // Grant permission to acting user
        $user = User::first();
        $user->givePermissionTo('sync themes');
        Passport::actingAs($user);

        // Place a minimal theme.json in the minimal folder before running this test
        $response = $this->postJson('/api/superadmin/themes/sync');
        $response->assertStatus(200)
            ->assertJsonFragment(['message' => 'Themes synced successfully.']);

        // Check that the minimal theme is now in the DB
        $this->assertDatabaseHas('themes', [
            'slug' => 'minimal',
            'name' => 'Minimal Theme',
            'unavailable' => false,
        ]);
    }

    #[Test]
    public function missing_theme_is_flagged_unavailable()
    {
        // Create a theme in DB that does not exist on disk
        Theme::create([
            'tenant_id' => null,
            'name' => 'Ghost Theme',
            'slug' => 'ghost',
            'base_theme' => 'ghost',
            'theme_data' => [],
            'description' => 'Should be flagged unavailable',
            'author' => 'Ghost',
            'version' => '1.0.0',
            'is_active' => true,
            'unavailable' => false,
        ]);

        // Grant permission to acting user
        $user = User::first();
        $user->givePermissionTo('sync themes');
        Passport::actingAs($user);

        $response = $this->postJson('/api/superadmin/themes/sync');
        $response->assertStatus(200);

        $this->assertDatabaseHas('themes', [
            'slug' => 'ghost',
            'unavailable' => true,
            'is_active' => false,
        ]);
    }
}
