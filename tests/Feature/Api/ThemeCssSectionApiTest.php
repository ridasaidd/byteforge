<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use App\Services\ThemeCssSectionService;
use App\Services\ThemeCssPublishService;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ThemeCssSectionApiTest extends TestCase
{
    private ThemeCssSectionService $sectionService;
    private ThemeCssPublishService $publishService;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->sectionService = new ThemeCssSectionService();
        $this->publishService = new ThemeCssPublishService($this->sectionService);
    }

    /** @test */
    public function superadmin_can_save_section_css(): void
    {
        $theme = Theme::factory()->create(['id' => 500]);
        $this->sectionService->initializeThemeFolder($theme);

        $superadmin = $this->getCentralUser('superadmin');

        $response = $this->actingAs($superadmin, 'api')
            ->postJson("/api/superadmin/themes/{$theme->id}/sections/variables", [
                'css' => ':root { --color-primary: #3b82f6; }',
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verify file was written
        $this->assertTrue($this->sectionService->sectionExists($theme->id, 'variables'));
    }

    /** @test */
    public function superadmin_can_get_section_css(): void
    {
        $theme = Theme::factory()->create(['id' => 501]);
        $this->sectionService->initializeThemeFolder($theme);

        $css = '.header { background: #fff; }';
        $this->sectionService->saveSectionCss($theme->id, 'header', $css);

        $superadmin = $this->getCentralUser('superadmin');

        $response = $this->actingAs($superadmin, 'api')
            ->getJson("/api/superadmin/themes/{$theme->id}/sections/header");

        $response->assertStatus(200);
        $response->assertJson(['css' => $css]);
    }

    /** @test */
    public function it_validates_publish_requirements(): void
    {
        $theme = Theme::factory()->create(['id' => 502]);
        $this->sectionService->initializeThemeFolder($theme);

        $superadmin = $this->getCentralUser('superadmin');

        $response = $this->actingAs($superadmin, 'api')
            ->getJson("/api/superadmin/themes/{$theme->id}/publish/validate");

        $response->assertStatus(200);
        $response->assertJson([
            'valid' => false,
            'missing' => ['variables', 'header', 'footer'],
        ]);
    }

    /** @test */
    public function it_validates_when_sections_are_complete(): void
    {
        $theme = Theme::factory()->create(['id' => 503]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss($theme->id, 'variables', ':root { }');
        $this->sectionService->saveSectionCss($theme->id, 'header', '.header { }');
        $this->sectionService->saveSectionCss($theme->id, 'footer', '.footer { }');

        $superadmin = $this->getCentralUser('superadmin');

        $response = $this->actingAs($superadmin, 'api')
            ->getJson("/api/superadmin/themes/{$theme->id}/publish/validate");

        $response->assertStatus(200);
        $response->assertJson([
            'valid' => true,
            'missing' => [],
        ]);
    }

    /** @test */
    public function superadmin_can_publish_theme(): void
    {
        $theme = Theme::factory()->create(['id' => 504]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss($theme->id, 'variables', ':root { }');
        $this->sectionService->saveSectionCss($theme->id, 'header', '.header { }');
        $this->sectionService->saveSectionCss($theme->id, 'footer', '.footer { }');

        $superadmin = $this->getCentralUser('superadmin');

        $response = $this->actingAs($superadmin, 'api')
            ->postJson("/api/superadmin/themes/{$theme->id}/publish");

        $response->assertStatus(200);
        $response->assertJsonStructure(['cssUrl']);

        // Verify master file was created
        $this->assertTrue(Storage::disk('public')->exists("themes/{$theme->id}/{$theme->id}.css"));
    }

    /** @test */
    public function publish_fails_with_missing_sections(): void
    {
        $theme = Theme::factory()->create(['id' => 505]);
        $this->sectionService->initializeThemeFolder($theme);

        // Only add one section
        $this->sectionService->saveSectionCss($theme->id, 'variables', ':root { }');

        $superadmin = $this->getCentralUser('superadmin');

        $response = $this->actingAs($superadmin, 'api')
            ->postJson("/api/superadmin/themes/{$theme->id}/publish");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('publish');
    }

    /** @test */
    public function non_superadmin_cannot_save_sections(): void
    {
        $theme = Theme::factory()->create(['id' => 506]);
        $this->sectionService->initializeThemeFolder($theme);

        // Use the viewer user created by TestFixturesSeeder
        // Viewer role only has themes.view, not themes.manage
        $viewerUser = $this->getCentralUser('viewer');

        $response = $this->actingAs($viewerUser, 'api')
            ->postJson("/api/superadmin/themes/{$theme->id}/sections/variables", [
                'css' => ':root { }',
            ]);

        $response->assertStatus(403);
    }
}
