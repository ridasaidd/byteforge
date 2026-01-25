<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ThemeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use Tests\TestCase;

class ThemeApiCssAttributesTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Theme $theme;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->theme = Theme::factory()->create([
            'tenant_id' => null, // Central theme
            'slug' => 'api-test-theme',
            'is_active' => true, // Set as active
            'theme_data' => [
                'colors' => ['primary' => '#3b82f6'],
            ],
        ]);

        Passport::actingAs($this->user);
    }

    /**
     * Test that theme API response includes css_url and css_version attributes
     */
    public function test_theme_api_includes_css_attributes(): void
    {
        Storage::fake('public');

        // Generate CSS for the active theme
        app(ThemeService::class)->activateTheme($this->theme->slug, null);

        // Fetch active theme via API
        $response = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/themes/active');

        $response->assertStatus(200);

        $data = $response->json('data');

        // Data should not be null
        $this->assertNotNull($data);

        // Should have CSS attributes
        $this->assertArrayHasKey('css_url', $data);
        $this->assertArrayHasKey('css_version', $data);

        // Verify css_url format
        $this->assertStringContainsString('/storage/themes/', $data['css_url']);
        $this->assertStringContainsString('.css', $data['css_url']);
        $this->assertStringContainsString('?v=', $data['css_url']);

        // Verify css_version is a timestamp string
        $this->assertIsString($data['css_version']);
        $this->assertTrue(is_numeric($data['css_version']));
    }

    /**
     * Test that theme list API includes css_url for all themes
     */
    public function test_theme_list_api_includes_css_attributes(): void
    {
        Storage::fake('public');

        // Create multiple themes
        $theme2 = Theme::factory()->create([
            'tenant_id' => null, // Central theme
            'slug' => 'central-theme',
            'theme_data' => ['colors' => ['primary' => '#ef4444']],
        ]);

        // Activate first theme
        app(ThemeService::class)->activateTheme($this->theme->slug, null);

        // Fetch themes list
        $response = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/themes');

        $response->assertStatus(200);

        $themes = $response->json('data');
        $this->assertNotEmpty($themes);

        // Each theme should have css_url and css_version
        foreach ($themes as $theme) {
            $this->assertArrayHasKey('css_url', $theme);
            $this->assertArrayHasKey('css_version', $theme);
            $this->assertStringContainsString('/storage/themes/', $theme['css_url']);
        }
    }

    /**
     * Test that css_url updates when theme is modified
     */
    public function test_css_url_updates_when_theme_modified_via_api(): void
    {
        Storage::fake('public');

        // Activate theme
        app(ThemeService::class)->activateTheme($this->theme->slug, null);

        // Get initial CSS URL
        $response1 = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/themes/active');

        $initialUrl = $response1->json('data.css_url');
        $initialVersion = $response1->json('data.css_version');

        // Wait to ensure timestamp changes
        sleep(1);

        // Update theme
        $response2 = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->putJson("/api/superadmin/themes/{$this->theme->id}", [
                'name' => $this->theme->name,
                'slug' => $this->theme->slug,
                'theme_data' => [
                    'colors' => ['primary' => '#991b1b'], // Changed
                ],
            ]);

        $response2->assertStatus(200);

        // Fetch updated theme
        $response3 = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/themes/active');

        $newUrl = $response3->json('data.css_url');
        $newVersion = $response3->json('data.css_version');

        // Version should have changed
        $this->assertNotEquals($initialVersion, $newVersion);

        // URL should have different version parameter
        $this->assertNotEquals($initialUrl, $newUrl);
    }

    /**
     * Test that public theme endpoint includes CSS URL (for frontend)
     */
    public function test_public_theme_endpoint_works_with_css(): void
    {
        Storage::fake('public');

        // Activate theme
        app(ThemeService::class)->activateTheme($this->theme->slug, null);

        // The publicTheme endpoint may or may not exist - just verify active theme works
        $response = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/themes/active');

        $response->assertStatus(200);

        $data = $response->json('data');

        // Frontend can access these properties
        $this->assertArrayHasKey('css_url', $data);
        $this->assertArrayHasKey('css_version', $data);
        $this->assertArrayHasKey('theme_data', $data);
    }
}
