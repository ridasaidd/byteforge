<?php

namespace Tests\Unit;

use App\Models\Layout;
use App\Models\Navigation;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\Theme;
use App\Models\ThemePart;
use App\Services\PuckCompilerService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PuckCompilerServiceTest extends TestCase
{
    use DatabaseTransactions;

    protected PuckCompilerService $compiler;

    protected function setUp(): void
    {
        parent::setUp();
        $this->compiler = new PuckCompilerService();

        // Note: Test fixtures seeder already creates users, no need to create additional ones
    }

    /** @test */
    public function it_compiles_simple_puck_data_without_modifications()
    {
        $page = Page::factory()->create([
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Text',
                        'props' => [
                            'text' => 'Hello World',
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertIsArray($compiled);
        $this->assertArrayHasKey('content', $compiled);
        $this->assertEquals('Hello World', $compiled['content'][0]['props']['text']);
    }

    /** @test */
    public function it_resolves_theme_color_tokens()
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => true,
            'theme_data' => [
                'colors' => [
                    'primary' => [
                        '500' => '#3B82F6',
                    ],
                ],
            ],
        ]);

        $page = Page::factory()->create([
            'tenant_id' => null,
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Button',
                        'props' => [
                            'backgroundColor' => 'colors.primary.500',
                            'text' => 'Click Me',
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertEquals('#3B82F6', $compiled['content'][0]['props']['backgroundColor']);
        $this->assertEquals('Click Me', $compiled['content'][0]['props']['text']);
    }

    /** @test */
    public function it_resolves_typography_tokens()
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => true,
            'theme_data' => [
                'typography' => [
                    'fontSize' => [
                        'xl' => '1.25rem',
                    ],
                ],
            ],
        ]);

        $page = Page::factory()->create([
            'tenant_id' => null,
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Text',
                        'props' => [
                            'fontSize' => 'typography.fontSize.xl',
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertEquals('1.25rem', $compiled['content'][0]['props']['fontSize']);
    }

    /** @test */
    public function it_preserves_non_token_values()
    {
        $page = Page::factory()->create([
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Button',
                        'props' => [
                            'backgroundColor' => '#FF0000',
                            'text' => 'Static Color',
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertEquals('#FF0000', $compiled['content'][0]['props']['backgroundColor']);
    }

    /** @test */
    public function it_embeds_navigation_data_when_navigation_component_present()
    {
        $navigation = Navigation::factory()->create([
            'name' => 'Main Menu',
            'status' => 'published',
            'structure' => [
                ['label' => 'Home', 'url' => '/'],
                ['label' => 'About', 'url' => '/about'],
            ],
        ]);

        $page = Page::factory()->create([
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Navigation',
                        'props' => [
                            'navigationId' => $navigation->id,
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertArrayHasKey('navigationData', $compiled['content'][0]['props']);
        $this->assertEquals('Main Menu', $compiled['content'][0]['props']['navigationData']['name']);
        $this->assertCount(2, $compiled['content'][0]['props']['navigationData']['structure']);
    }

    /** @test */
    public function it_handles_missing_navigation_gracefully()
    {
        $page = Page::factory()->create([
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Navigation',
                        'props' => [
                            'navigationId' => 99999, // Non-existent ID
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertArrayHasKey('navigationData', $compiled['content'][0]['props']);
        $this->assertNull($compiled['content'][0]['props']['navigationData']);
    }

    /** @test */
    public function it_compiles_page_content_with_header_footer_from_active_theme()
    {
        // Setup Tenant
        $tenant = Tenant::factory()->create();
        $tenantId = $tenant->id;

        // Setup Active Theme
        $theme = Theme::factory()->create([
            'tenant_id' => $tenantId,
            'is_active' => true,
        ]);

        // Setup Header Part for this tenant/theme
        ThemePart::factory()->create([
            'tenant_id' => $tenantId,
            'theme_id' => $theme->id,
            'type' => 'header',
            'status' => 'published',
            'puck_data_raw' => [
                'content' => [
                    ['type' => 'Header', 'props' => ['title' => 'Site Header']],
                ],
            ],
        ]);

        // Setup Footer Part
        ThemePart::factory()->create([
            'tenant_id' => $tenantId,
            'theme_id' => $theme->id,
            'type' => 'footer',
            'status' => 'published',
            'puck_data_raw' => [
                'content' => [
                    ['type' => 'Footer', 'props' => ['text' => 'Copyright 2025']],
                ],
            ],
        ]);

        $page = Page::factory()->create([
            'tenant_id' => $tenantId,
            'puck_data' => [
                'content' => [
                    ['type' => 'Text', 'props' => ['text' => 'Page Content']],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        // Should compile header + page content + footer
        $this->assertCount(3, $compiled['content']);
        $this->assertEquals('Site Header', $compiled['content'][0]['props']['title']);
        $this->assertEquals('Page Content', $compiled['content'][1]['props']['text']);
        $this->assertEquals('Copyright 2025', $compiled['content'][2]['props']['text']);
    }

    /** @test */
    public function it_compiles_theme_part_with_tokens()
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => true,
            'theme_data' => [
                'colors' => [
                    'primary' => [
                        '500' => '#3B82F6',
                    ],
                ],
            ],
        ]);

        $themePart = ThemePart::factory()->create([
            'tenant_id' => null,
            'type' => 'header',
            'puck_data_raw' => [
                'content' => [
                    [
                        'type' => 'Header',
                        'props' => [
                            'backgroundColor' => 'colors.primary.500',
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compileThemePart($themePart);

        $this->assertEquals('#3B82F6', $compiled['content'][0]['props']['backgroundColor']);
    }

    /** @test */
    public function it_handles_nested_props_with_tokens()
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => true,
            'theme_data' => [
                'spacing' => [
                    'md' => '1rem',
                ],
            ],
        ]);

        $page = Page::factory()->create([
            'tenant_id' => null,
            'puck_data' => [
                'content' => [
                    [
                        'type' => 'Container',
                        'props' => [
                            'padding' => 'spacing.md',
                            'style' => [
                                'margin' => 'spacing.md',
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertEquals('1rem', $compiled['content'][0]['props']['padding']);
        $this->assertEquals('1rem', $compiled['content'][0]['props']['style']['margin']);
    }

    /** @test */
    public function it_returns_empty_array_for_empty_puck_data()
    {
        $page = Page::factory()->create([
            'puck_data' => [],
        ]);

        $compiled = $this->compiler->compilePage($page);

        $this->assertIsArray($compiled);
        // Empty puck_data still returns full structure with metadata
        $this->assertArrayHasKey('content', $compiled);
        $this->assertArrayHasKey('root', $compiled);
        $this->assertArrayHasKey('zones', $compiled);
        $this->assertArrayHasKey('metadata', $compiled);
        $this->assertEmpty($compiled['content']);
    }
}
