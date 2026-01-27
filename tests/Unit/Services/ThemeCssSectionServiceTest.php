<?php

namespace Tests\Unit\Services;

use App\Models\Theme;
use App\Services\ThemeCssSectionService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class ThemeCssSectionServiceTest extends BaseTestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    private ThemeCssSectionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        // Don't run seeders for this unit test
        $this->service = new ThemeCssSectionService();
        Storage::fake('public');
    }

    /** @test */
    public function it_creates_theme_folder(): void
    {
        $theme = Theme::factory()->create(['id' => 123]);

        $this->service->initializeThemeFolder($theme);

        $this->assertTrue(Storage::disk('public')->exists('themes/123'));
    }

    /** @test */
    public function it_saves_section_css_to_file(): void
    {
        $theme = Theme::factory()->create(['id' => 456]);
        $this->service->initializeThemeFolder($theme);

        $css = ':root { --color-primary: #3b82f6; }';
        $this->service->saveSectionCss(456, 'variables', $css);

        $this->assertTrue(Storage::disk('public')->exists('themes/456/456_variables.css'));
        $this->assertEquals($css, Storage::disk('public')->get('themes/456/456_variables.css'));
    }

    /** @test */
    public function it_retrieves_section_css(): void
    {
        $theme = Theme::factory()->create(['id' => 789]);
        $this->service->initializeThemeFolder($theme);

        $css = '.box { background: #fff; }';
        $this->service->saveSectionCss(789, 'header', $css);

        $retrieved = $this->service->getSectionCss(789, 'header');
        $this->assertEquals($css, $retrieved);
    }

    /** @test */
    public function it_returns_null_for_nonexistent_section(): void
    {
        $result = $this->service->getSectionCss(999, 'nonexistent');
        $this->assertNull($result);
    }

    /** @test */
    public function it_checks_if_section_exists(): void
    {
        $theme = Theme::factory()->create(['id' => 101]);
        $this->service->initializeThemeFolder($theme);

        $this->assertFalse($this->service->sectionExists(101, 'variables'));

        $this->service->saveSectionCss(101, 'variables', ':root { }');

        $this->assertTrue($this->service->sectionExists(101, 'variables'));
    }

    /** @test */
    public function it_returns_required_sections(): void
    {
        $required = $this->service->getRequiredSections();

        $this->assertIsArray($required);
        $this->assertContains('variables', $required);
        $this->assertContains('header', $required);
        $this->assertContains('footer', $required);
    }

    /** @test */
    public function it_gets_all_section_files(): void
    {
        $theme = Theme::factory()->create(['id' => 202]);
        $this->service->initializeThemeFolder($theme);

        $this->service->saveSectionCss(202, 'variables', ':root { }');
        $this->service->saveSectionCss(202, 'header', '.header { }');
        $this->service->saveSectionCss(202, 'footer', '.footer { }');

        $files = $this->service->getAllSectionFiles(202);

        $this->assertIsArray($files);
        $this->assertCount(3, $files);
        $this->assertContains('202_variables.css', $files);
        $this->assertContains('202_header.css', $files);
        $this->assertContains('202_footer.css', $files);
    }

    /** @test */
    public function it_overwrites_section_css_on_resave(): void
    {
        $theme = Theme::factory()->create(['id' => 303]);
        $this->service->initializeThemeFolder($theme);

        $css1 = ':root { --color-primary: #3b82f6; }';
        $this->service->saveSectionCss(303, 'variables', $css1);
        $this->assertEquals($css1, $this->service->getSectionCss(303, 'variables'));

        $css2 = ':root { --color-primary: #ef4444; }';
        $this->service->saveSectionCss(303, 'variables', $css2);
        $this->assertEquals($css2, $this->service->getSectionCss(303, 'variables'));
    }

    /** @test */
    public function it_handles_template_section_names(): void
    {
        $theme = Theme::factory()->create(['id' => 404]);
        $this->service->initializeThemeFolder($theme);

        $css = '.template { }';
        $this->service->saveSectionCss(404, 'template-homepage', $css);

        $this->assertTrue($this->service->sectionExists(404, 'template-homepage'));
        $this->assertEquals($css, $this->service->getSectionCss(404, 'template-homepage'));
    }
}
