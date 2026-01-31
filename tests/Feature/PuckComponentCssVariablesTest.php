<?php

namespace Tests\Feature;

use App\Models\Theme;
use App\Services\ThemeCssGeneratorService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Phase 4: Test that Puck components can use CSS variables for theming
 *
 * This test verifies:
 * - ThemeCssGeneratorService generates comprehensive CSS variables (typography, colors, spacing, etc.)
 * - CSS files include all necessary variables for component styling
 * - CSS variables follow consistent naming conventions
 * - Components can rely on CSS variables being available
 */
class PuckComponentCssVariablesTest extends TestCase
{
    use DatabaseTransactions;

    protected ThemeCssGeneratorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(ThemeCssGeneratorService::class);
    }

    /** @test */
    public function css_generator_creates_typography_variables()
    {
        // Arrange: Theme with comprehensive typography data
        $themeData = [
            'typography' => [
                'fontFamily' => [
                    'heading' => '"Inter", sans-serif',
                    'body' => '"Roboto", sans-serif',
                    'mono' => '"Fira Code", monospace',
                ],
                'fontSize' => [
                    'xs' => '0.75rem',
                    'sm' => '0.875rem',
                    'base' => '1rem',
                    'lg' => '1.125rem',
                    'xl' => '1.25rem',
                    '2xl' => '1.5rem',
                    '3xl' => '1.875rem',
                    '4xl' => '2.25rem',
                ],
                'fontWeight' => [
                    'normal' => '400',
                    'medium' => '500',
                    'semibold' => '600',
                    'bold' => '700',
                ],
                'lineHeight' => [
                    'tight' => '1.25',
                    'normal' => '1.5',
                    'relaxed' => '1.75',
                ],
                'letterSpacing' => [
                    'tight' => '-0.025em',
                    'normal' => '0',
                    'wide' => '0.025em',
                ],
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Typography variables are present
        $this->assertStringContainsString('--font-family-heading: "Inter", sans-serif;', $css);
        $this->assertStringContainsString('--font-family-body: "Roboto", sans-serif;', $css);
        $this->assertStringContainsString('--font-size-base: 1rem;', $css);
        $this->assertStringContainsString('--font-size-xl: 1.25rem;', $css);
        $this->assertStringContainsString('--font-weight-normal: 400;', $css);
        $this->assertStringContainsString('--font-weight-bold: 700;', $css);
        $this->assertStringContainsString('--line-height-normal: 1.5;', $css);
        $this->assertStringContainsString('--letter-spacing-normal: 0;', $css);
    }

    /** @test */
    public function css_generator_creates_color_variables_for_all_shades()
    {
        // Arrange: Theme with comprehensive color palette
        $themeData = [
            'colors' => [
                'primary' => [
                    '50' => '#eff6ff',
                    '100' => '#dbeafe',
                    '200' => '#bfdbfe',
                    '300' => '#93c5fd',
                    '400' => '#60a5fa',
                    '500' => '#3b82f6',
                    '600' => '#2563eb',
                    '700' => '#1d4ed8',
                    '800' => '#1e40af',
                    '900' => '#1e3a8a',
                ],
                'neutral' => [
                    'white' => '#ffffff',
                    'black' => '#000000',
                ],
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Color variables for all shades
        $this->assertStringContainsString('--color-primary-50: #eff6ff;', $css);
        $this->assertStringContainsString('--color-primary-500: #3b82f6;', $css);
        $this->assertStringContainsString('--color-primary-900: #1e3a8a;', $css);
        $this->assertStringContainsString('--color-neutral-white: #ffffff;', $css);
        $this->assertStringContainsString('--color-neutral-black: #000000;', $css);
    }

    /** @test */
    public function css_generator_creates_spacing_variables()
    {
        // Arrange: Theme with spacing scale
        $themeData = [
            'spacing' => [
                '0' => '0',
                '1' => '0.25rem',
                '2' => '0.5rem',
                '4' => '1rem',
                '8' => '2rem',
                '16' => '4rem',
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Spacing variables
        $this->assertStringContainsString('--spacing-0: 0;', $css);
        $this->assertStringContainsString('--spacing-1: 0.25rem;', $css);
        $this->assertStringContainsString('--spacing-4: 1rem;', $css);
        $this->assertStringContainsString('--spacing-16: 4rem;', $css);
    }

    /** @test */
    public function css_generator_creates_border_radius_variables()
    {
        // Arrange: Theme with border radius values
        $themeData = [
            'borderRadius' => [
                'none' => '0',
                'sm' => '0.125rem',
                'md' => '0.375rem',
                'lg' => '0.5rem',
                'xl' => '0.75rem',
                'full' => '9999px',
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Border radius variables
        $this->assertStringContainsString('--border-radius-none: 0;', $css);
        $this->assertStringContainsString('--border-radius-md: 0.375rem;', $css);
        $this->assertStringContainsString('--border-radius-full: 9999px;', $css);
    }

    /** @test */
    public function css_generator_creates_shadow_variables()
    {
        // Arrange: Theme with shadow definitions
        $themeData = [
            'shadows' => [
                'sm' => '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'md' => '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                'lg' => '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                'none' => 'none',
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Shadow variables
        $this->assertStringContainsString('--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);', $css);
        $this->assertStringContainsString('--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);', $css);
        $this->assertStringContainsString('--shadow-none: none;', $css);
    }

    /** @test */
    public function css_generator_creates_component_default_variables()
    {
        // Arrange: Theme with component defaults
        $themeData = [
            'colors' => [
                'primary' => ['500' => '#3b82f6'],
            ],
            'components' => [
                'button' => [
                    'variants' => [
                        'primary' => [
                            'backgroundColor' => 'colors.primary.500',
                            'color' => '#ffffff',
                        ],
                    ],
                ],
                'heading' => [
                    'colors' => [
                        'default' => '#1f2937',
                    ],
                ],
                'text' => [
                    'colors' => [
                        'default' => '#4b5563',
                    ],
                ],
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Component default variables exist
        $this->assertStringContainsString('--component-button-variant-primary-background-color:', $css);
        $this->assertStringContainsString('--component-button-variant-primary-color: #ffffff;', $css);
        $this->assertStringContainsString('--component-heading-color-default: #1f2937;', $css);
        $this->assertStringContainsString('--component-text-color-default: #4b5563;', $css);
    }

    /** @test */
    public function css_variables_use_consistent_naming_convention()
    {
        // Arrange: Theme with various nested structures
        $themeData = [
            'colors' => [
                'primary' => ['500' => '#3b82f6'],
            ],
            'typography' => [
                'fontFamily' => ['heading' => 'Inter'],
            ],
            'spacing' => [
                '4' => '1rem',
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Naming follows pattern: --{category}-{nested}-{key}
        // colors -> --color-primary-500
        $this->assertStringContainsString('--color-primary-500:', $css);

        // typography.fontFamily -> --font-family-heading
        $this->assertStringContainsString('--font-family-heading:', $css);

        // spacing -> --spacing-4
        $this->assertStringContainsString('--spacing-4:', $css);

        // Verify no double dashes (except at start)
        $this->assertStringNotContainsString('--color--', $css);
        $this->assertStringNotContainsString('--font--', $css);
    }

    /** @test */
    public function theme_with_comprehensive_data_generates_complete_css()
    {
        // Arrange: Create a theme with comprehensive data
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'name' => 'Complete Theme',
            'is_active' => true,
            'theme_data' => [
                'colors' => [
                    'primary' => ['500' => '#3b82f6', '600' => '#2563eb'],
                    'neutral' => ['white' => '#ffffff'],
                ],
                'typography' => [
                    'fontFamily' => ['body' => 'Inter'],
                    'fontSize' => ['base' => '1rem'],
                    'fontWeight' => ['normal' => '400'],
                ],
                'spacing' => ['4' => '1rem'],
                'borderRadius' => ['md' => '0.375rem'],
                'shadows' => ['sm' => '0 1px 2px rgba(0,0,0,0.1)'],
            ],
        ]);

        // Act: Generate CSS (file writing is handled by ThemeCssPublishService in production)
        $css = $this->service->generateCss($theme->theme_data);

        // Assert: CSS contains expected structure
        $this->assertStringContainsString(':root {', $css);
        $this->assertStringContainsString('}', $css);

        // Check all categories present
        $this->assertStringContainsString('--color-', $css);
        $this->assertStringContainsString('--font-', $css);
        $this->assertStringContainsString('--spacing-', $css);
        $this->assertStringContainsString('--border-radius-', $css);
        $this->assertStringContainsString('--shadow-', $css);
    }

    /** @test */
    public function css_variables_can_be_used_in_component_styles()
    {
        // Arrange: Theme with component-friendly variables
        $themeData = [
            'colors' => [
                'primary' => ['500' => '#3b82f6'],
            ],
            'typography' => [
                'fontFamily' => ['heading' => '"Inter", sans-serif'],
                'fontSize' => ['xl' => '1.25rem'],
                'fontWeight' => ['bold' => '700'],
            ],
        ];

        // Act: Generate CSS
        $css = $this->service->generateCss($themeData);

        // Assert: Variables are ready for use in component styles
        // Example: style={{ color: 'var(--color-primary-500)' }}
        $this->assertMatchesRegularExpression('/--color-primary-500:\s*#3b82f6;/', $css);

        // Example: style={{ fontFamily: 'var(--font-family-heading)' }}
        $this->assertMatchesRegularExpression('/--font-family-heading:\s*"Inter", sans-serif;/', $css);

        // Example: style={{ fontSize: 'var(--font-size-xl)' }}
        $this->assertMatchesRegularExpression('/--font-size-xl:\s*1\.25rem;/', $css);

        // Example: style={{ fontWeight: 'var(--font-weight-bold)' }}
        $this->assertMatchesRegularExpression('/--font-weight-bold:\s*700;/', $css);
    }
}
