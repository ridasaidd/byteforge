<?php

namespace Tests\Feature;

use App\Models\Theme;
use App\Models\Tenant;
use App\Services\ThemeCssGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ThemeCssGenerationTest extends TestCase
{
    use RefreshDatabase;

    protected Theme $theme;
    protected Tenant $tenant;
    protected ThemeCssGeneratorService $cssGenerator;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a test tenant
        $this->tenant = Tenant::factory()->create();

        // Create a theme with sample data
        $this->theme = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'theme_data' => [
                'colors' => [
                    'primary' => '#3b82f6',
                    'secondary' => '#10b981',
                ],
                'typography' => [
                    'fontFamily' => [
                        'body' => 'Inter, sans-serif',
                    ],
                    'fontSize' => [
                        'base' => '1rem',
                    ],
                ],
                'spacing' => [
                    '4' => '1rem',
                    '8' => '2rem',
                ],
            ],
        ]);

        $this->cssGenerator = app(ThemeCssGeneratorService::class);
    }

    /**
     * Test that CSS is generated when a theme is activated
     */
    public function test_css_file_is_created_when_theme_is_activated(): void
    {
        // Fake the storage disk
        Storage::fake('public');

        // Generate CSS
        $css = $this->cssGenerator->generateCss($this->theme->theme_data);
        $version = $this->cssGenerator->getCssVersion();

        // Write the CSS file
        $success = $this->cssGenerator->writeCssFile($this->theme->id, $css);

        // Assert the file was created
        $this->assertTrue($success);
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");

        // Verify file content
        $content = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $content);
        $this->assertStringContainsString('--color-secondary: #10b981;', $content);
        $this->assertStringContainsString('--font-family-body: Inter, sans-serif;', $content);
    }

    /**
     * Test that CSS URL is generated correctly with cache busting
     */
    public function test_css_url_includes_version_for_cache_busting(): void
    {
        $version = '1705972800';
        $url = $this->cssGenerator->getCssUrl($this->theme->id, $version);

        $this->assertStringContainsString("/storage/themes/{$this->theme->id}.css", $url);
        $this->assertStringContainsString("v={$version}", $url);
    }

    /**
     * Test that CSS is regenerated when theme data is updated
     */
    public function test_css_file_is_updated_when_theme_data_changes(): void
    {
        Storage::fake('public');

        // Generate and write initial CSS
        $initialCss = $this->cssGenerator->generateCss($this->theme->theme_data);
        $this->cssGenerator->writeCssFile($this->theme->id, $initialCss);

        // Verify initial content
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");
        $initialContent = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringContainsString('--color-primary: #3b82f6;', $initialContent);

        // Update theme data
        $this->theme->theme_data = [
            'colors' => [
                'primary' => '#ef4444', // Changed from #3b82f6
                'secondary' => '#10b981',
            ],
            'typography' => [
                'fontFamily' => [
                    'body' => 'Georgia, serif', // Changed from Inter
                ],
            ],
        ];
        $this->theme->save();

        // Generate and write updated CSS
        $updatedCss = $this->cssGenerator->generateCss($this->theme->theme_data);
        $this->cssGenerator->writeCssFile($this->theme->id, $updatedCss);

        // Verify updated content
        $updatedContent = Storage::disk('public')->get("themes/{$this->theme->id}.css");
        $this->assertStringNotContainsString('--color-primary: #3b82f6;', $updatedContent);
        $this->assertStringContainsString('--color-primary: #ef4444;', $updatedContent);
        $this->assertStringContainsString('--font-family-body: Georgia, serif;', $updatedContent);
    }

    /**
     * Test that CSS file can be deleted
     */
    public function test_css_file_can_be_deleted(): void
    {
        Storage::fake('public');

        // Create the CSS file
        $css = $this->cssGenerator->generateCss($this->theme->theme_data);
        $this->cssGenerator->writeCssFile($this->theme->id, $css);
        Storage::disk('public')->assertExists("themes/{$this->theme->id}.css");

        // Delete the CSS file
        $success = $this->cssGenerator->deleteCssFile($this->theme->id);

        $this->assertTrue($success);
        Storage::disk('public')->assertMissing("themes/{$this->theme->id}.css");
    }

    /**
     * Test CSS with deeply nested theme data
     */
    public function test_css_handles_complex_nested_theme_data(): void
    {
        $complexTheme = Theme::factory()->create([
            'tenant_id' => $this->tenant->id,
            'theme_data' => [
                'colors' => [
                    'semantic' => [
                        'success' => [
                            'light' => '#dcfce7',
                            'main' => '#22c55e',
                            'dark' => '#15803d',
                        ],
                        'error' => [
                            'light' => '#fee2e2',
                            'main' => '#ef4444',
                            'dark' => '#991b1b',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generateCss($complexTheme->theme_data);

        // Verify deeply nested variables are flattened correctly
        $this->assertStringContainsString('--color-semantic-success-light: #dcfce7;', $css);
        $this->assertStringContainsString('--color-semantic-success-main: #22c55e;', $css);
        $this->assertStringContainsString('--color-semantic-error-dark: #991b1b;', $css);
    }
}
