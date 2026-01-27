<?php

namespace Tests\Unit\Services;

use App\Services\ThemeCssGeneratorService;
use PHPUnit\Framework\TestCase;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Mockery;

class ThemeCssGeneratorServiceTest extends TestCase
{
    protected $service;
    protected $fileSystem;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fileSystem = Mockery::mock(Filesystem::class);
        $this->service = new ThemeCssGeneratorService($this->fileSystem);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Test CSS generation with basic color tokens
     */
    public function test_generates_css_with_color_variables(): void
    {
        $themeData = [
            'colors' => [
                'primary' => '#3b82f6',
                'secondary' => '#10b981',
                'danger' => '#ef4444',
                'neutral' => [
                    'white' => '#ffffff',
                    'gray' => [
                        '50' => '#f9fafb',
                        '900' => '#111827',
                    ],
                ],
            ],
        ];

        $css = $this->service->generateCss($themeData);

        // Assert color variables are present
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css);
        $this->assertStringContainsString('--color-secondary: #10b981;', $css);
        $this->assertStringContainsString('--color-danger: #ef4444;', $css);
        $this->assertStringContainsString('--color-neutral-white: #ffffff;', $css);
        $this->assertStringContainsString('--color-neutral-gray-50: #f9fafb;', $css);
        $this->assertStringContainsString('--color-neutral-gray-900: #111827;', $css);

        // Assert CSS is valid
        $this->assertStringContainsString(':root {', $css);
        $this->assertStringContainsString('}', $css);
    }

    /**
     * Test CSS generation with typography tokens
     */
    public function test_generates_css_with_typography_variables(): void
    {
        $themeData = [
            'typography' => [
                'fontFamily' => [
                    'body' => 'Inter, sans-serif',
                    'heading' => 'Playfair Display, serif',
                ],
                'fontSize' => [
                    'base' => '1rem',
                    'lg' => '1.125rem',
                    'xl' => '1.25rem',
                ],
                'fontWeight' => [
                    'normal' => '400',
                    'semibold' => '600',
                    'bold' => '700',
                ],
                'lineHeight' => [
                    'tight' => '1.25',
                    'normal' => '1.5',
                    'relaxed' => '1.75',
                ],
            ],
        ];

        $css = $this->service->generateCss($themeData);

        // Assert typography variables
        $this->assertStringContainsString('--font-family-body: Inter, sans-serif;', $css);
        $this->assertStringContainsString('--font-family-heading: Playfair Display, serif;', $css);
        $this->assertStringContainsString('--font-size-base: 1rem;', $css);
        $this->assertStringContainsString('--font-size-lg: 1.125rem;', $css);
        $this->assertStringContainsString('--font-weight-normal: 400;', $css);
        $this->assertStringContainsString('--font-weight-bold: 700;', $css);
        $this->assertStringContainsString('--line-height-tight: 1.25;', $css);
        $this->assertStringContainsString('--line-height-relaxed: 1.75;', $css);
    }

    /**
     * Test CSS generation with spacing tokens
     */
    public function test_generates_css_with_spacing_variables(): void
    {
        $themeData = [
            'spacing' => [
                '0' => '0',
                '2' => '0.5rem',
                '4' => '1rem',
                '6' => '1.5rem',
                '8' => '2rem',
            ],
        ];

        $css = $this->service->generateCss($themeData);

        $this->assertStringContainsString('--spacing-0: 0;', $css);
        $this->assertStringContainsString('--spacing-2: 0.5rem;', $css);
        $this->assertStringContainsString('--spacing-4: 1rem;', $css);
        $this->assertStringContainsString('--spacing-6: 1.5rem;', $css);
        $this->assertStringContainsString('--spacing-8: 2rem;', $css);
    }

    /**
     * Test CSS generation with border radius tokens
     */
    public function test_generates_css_with_border_radius_variables(): void
    {
        $themeData = [
            'radius' => [
                'none' => '0',
                'sm' => '0.125rem',
                'base' => '0.25rem',
                'lg' => '0.5rem',
                'full' => '9999px',
            ],
        ];

        $css = $this->service->generateCss($themeData);

        $this->assertStringContainsString('--radius-none: 0;', $css);
        $this->assertStringContainsString('--radius-sm: 0.125rem;', $css);
        $this->assertStringContainsString('--radius-base: 0.25rem;', $css);
        $this->assertStringContainsString('--radius-lg: 0.5rem;', $css);
        $this->assertStringContainsString('--radius-full: 9999px;', $css);
    }

    /**
     * Test CSS generation with shadow tokens
     */
    public function test_generates_css_with_shadow_variables(): void
    {
        $themeData = [
            'shadows' => [
                'sm' => '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'base' => '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                'lg' => '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            ],
        ];

        $css = $this->service->generateCss($themeData);

        $this->assertStringContainsString('--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);', $css);
        $this->assertStringContainsString('--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1);', $css);
        $this->assertStringContainsString('--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);', $css);
    }

    /**
     * Test CSS generation with mixed tokens
     */
    public function test_generates_complete_css_with_all_token_types(): void
    {
        $themeData = [
            'colors' => ['primary' => '#3b82f6'],
            'typography' => ['fontFamily' => ['body' => 'Inter']],
            'spacing' => ['4' => '1rem'],
            'radius' => ['base' => '0.25rem'],
            'shadows' => ['sm' => '0 1px 2px 0 rgb(0 0 0 / 0.05)'],
        ];

        $css = $this->service->generateCss($themeData);

        // All variable types should be present
        $this->assertStringContainsString('--color-primary: #3b82f6;', $css);
        $this->assertStringContainsString('--font-family-body: Inter;', $css);
        $this->assertStringContainsString('--spacing-4: 1rem;', $css);
        $this->assertStringContainsString('--radius-base: 0.25rem;', $css);
        $this->assertStringContainsString('--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);', $css);

        // Should be wrapped in :root block
        $this->assertStringContainsString(':root {', $css);
        $this->assertStringContainsString('}', $css);
    }

    /**
     * Test generateCssUrl returns correct public URL
     */
    public function test_generates_correct_css_url_with_cache_busting(): void
    {
        // Mock the URL generation
        $themeId = 1;
        $version = '1705972800';

        $url = $this->service->getCssUrl($themeId, $version);

        $this->assertStringContainsString('/storage/themes/1.css', $url);
        $this->assertStringContainsString('v=1705972800', $url);
    }

    /**
     * Test handleNullOrEmptyThemeData
     */
    public function test_handles_null_or_empty_theme_data(): void
    {
        $css = $this->service->generateCss(null);
        $this->assertStringContainsString(':root {', $css);
        $this->assertStringContainsString('}', $css);

        $css = $this->service->generateCss([]);
        $this->assertStringContainsString(':root {', $css);
        $this->assertStringContainsString('}', $css);
    }

    /**
     * Test CSS contains valid CSS syntax
     */
    public function test_generated_css_has_valid_syntax(): void
    {
        $themeData = [
            'colors' => ['primary' => '#3b82f6'],
            'spacing' => ['4' => '1rem'],
        ];

        $css = $this->service->generateCss($themeData);

        // Check for proper CSS variable declaration syntax
        $this->assertMatchesRegularExpression('/:root\s*\{/', $css);
        $this->assertMatchesRegularExpression('/--[\w-]+:\s*[^;]+;/', $css);
        $this->assertStringEndsWith('}', trim($css));
    }

    /**
     * Test deeply nested theme data is flattened
     */
    public function test_flattens_deeply_nested_theme_data(): void
    {
        $themeData = [
            'colors' => [
                'semantic' => [
                    'success' => [
                        'light' => '#dcfce7',
                        'main' => '#22c55e',
                        'dark' => '#15803d',
                    ],
                ],
            ],
        ];

        $css = $this->service->generateCss($themeData);

        $this->assertStringContainsString('--color-semantic-success-light: #dcfce7;', $css);
        $this->assertStringContainsString('--color-semantic-success-main: #22c55e;', $css);
        $this->assertStringContainsString('--color-semantic-success-dark: #15803d;', $css);
    }
}
