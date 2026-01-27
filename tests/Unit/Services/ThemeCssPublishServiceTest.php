<?php

namespace Tests\Unit\Services;

use App\Models\Theme;
use App\Services\ThemeCssSectionService;
use App\Services\ThemeCssPublishService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Storage;

class ThemeCssPublishServiceTest extends BaseTestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    private ThemeCssSectionService $sectionService;
    private ThemeCssPublishService $publishService;

    protected function setUp(): void
    {
        parent::setUp();
        // Don't run seeders for this unit test
        Storage::fake('public');

        $this->sectionService = new ThemeCssSectionService();
        $this->publishService = new ThemeCssPublishService($this->sectionService);
    }

    /** @test */
    public function it_validates_required_sections_missing(): void
    {
        $theme = Theme::factory()->create(['id' => 100]);
        $this->sectionService->initializeThemeFolder($theme);

        $missing = $this->publishService->validateRequiredSections(100);

        $this->assertIsArray($missing);
        $this->assertContains('variables', $missing);
        $this->assertContains('header', $missing);
        $this->assertContains('footer', $missing);
    }

    /** @test */
    public function it_validates_partial_sections(): void
    {
        $theme = Theme::factory()->create(['id' => 101]);
        $this->sectionService->initializeThemeFolder($theme);

        // Only add variables
        $this->sectionService->saveSectionCss(101, 'variables', ':root { }');

        $missing = $this->publishService->validateRequiredSections(101);

        $this->assertCount(2, $missing);
        $this->assertContains('header', $missing);
        $this->assertContains('footer', $missing);
        $this->assertNotContains('variables', $missing);
    }

    /** @test */
    public function it_validates_all_required_sections_present(): void
    {
        $theme = Theme::factory()->create(['id' => 102]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss(102, 'variables', ':root { }');
        $this->sectionService->saveSectionCss(102, 'header', '.header { }');
        $this->sectionService->saveSectionCss(102, 'footer', '.footer { }');

        $missing = $this->publishService->validateRequiredSections(102);

        $this->assertEmpty($missing);
    }

    /** @test */
    public function it_merges_section_files(): void
    {
        $theme = Theme::factory()->create(['id' => 103]);
        $this->sectionService->initializeThemeFolder($theme);

        $vars = ':root { --color-primary: #3b82f6; }';
        $header = '.header { background: #fff; }';
        $footer = '.footer { background: #f9fafb; }';

        $this->sectionService->saveSectionCss(103, 'variables', $vars);
        $this->sectionService->saveSectionCss(103, 'header', $header);
        $this->sectionService->saveSectionCss(103, 'footer', $footer);

        $merged = $this->publishService->mergeAllSections(103);

        $this->assertStringContainsString($vars, $merged);
        $this->assertStringContainsString($header, $merged);
        $this->assertStringContainsString($footer, $merged);
    }

    /** @test */
    public function it_includes_templates_in_merge(): void
    {
        $theme = Theme::factory()->create(['id' => 104]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss(104, 'variables', ':root { }');
        $this->sectionService->saveSectionCss(104, 'header', '.header { }');
        $this->sectionService->saveSectionCss(104, 'footer', '.footer { }');
        $this->sectionService->saveSectionCss(104, 'template-homepage', '.template { }');
        $this->sectionService->saveSectionCss(104, 'template-about', '.about { }');

        $merged = $this->publishService->mergeAllSections(104);

        $this->assertStringContainsString('.template { }', $merged);
        $this->assertStringContainsString('.about { }', $merged);
    }

    /** @test */
    public function it_publishes_theme_with_valid_sections(): void
    {
        $theme = Theme::factory()->create(['id' => 105]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss(105, 'variables', ':root { }');
        $this->sectionService->saveSectionCss(105, 'header', '.header { }');
        $this->sectionService->saveSectionCss(105, 'footer', '.footer { }');

        $cssUrl = $this->publishService->publishTheme(105);

        $this->assertIsString($cssUrl);
        $this->assertStringContainsString('/storage/themes/105/105.css', $cssUrl);
        $this->assertTrue(Storage::disk('public')->exists('themes/105/105.css'));
    }

    /** @test */
    public function it_merges_in_correct_order(): void
    {
        $theme = Theme::factory()->create(['id' => 106]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss(106, 'variables', 'VARIABLES');
        $this->sectionService->saveSectionCss(106, 'header', 'HEADER');
        $this->sectionService->saveSectionCss(106, 'footer', 'FOOTER');

        $merged = $this->publishService->mergeAllSections(106);

        // Check order: variables → header → footer
        $varsPos = strpos($merged, 'VARIABLES');
        $headerPos = strpos($merged, 'HEADER');
        $footerPos = strpos($merged, 'FOOTER');

        $this->assertLessThan($headerPos, $varsPos);
        $this->assertLessThan($footerPos, $headerPos);
    }

    /** @test */
    public function it_throws_exception_when_publishing_with_missing_sections(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Missing required sections');

        $theme = Theme::factory()->create(['id' => 107]);
        $this->sectionService->initializeThemeFolder($theme);

        // Only add one section
        $this->sectionService->saveSectionCss(107, 'variables', ':root { }');

        $this->publishService->publishTheme(107);
    }

    /** @test */
    public function it_returns_css_url_with_version_hash(): void
    {
        $theme = Theme::factory()->create(['id' => 108]);
        $this->sectionService->initializeThemeFolder($theme);

        $this->sectionService->saveSectionCss(108, 'variables', ':root { }');
        $this->sectionService->saveSectionCss(108, 'header', '.header { }');
        $this->sectionService->saveSectionCss(108, 'footer', '.footer { }');

        $cssUrl = $this->publishService->publishTheme(108);

        // Should contain cache-busting query parameter
        $this->assertStringContainsString('?v=', $cssUrl);
    }
}
