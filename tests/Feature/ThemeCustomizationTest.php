<?php

namespace Tests\Feature;

use App\Models\Theme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemeCustomizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that themes table has customization CSS columns
     *
     * Phase 6 Step 1: Database Migration
     */
    public function test_themes_table_has_customization_columns(): void
    {
        // Arrange & Act: Create a theme with customization CSS columns
        $theme = Theme::factory()->create([
            'settings_css' => ':root { --custom: red; }',
            'header_css' => '.header { color: blue; }',
            'footer_css' => '.footer { color: green; }',
        ]);

        // Assert: Verify columns are saved correctly
        $this->assertNotNull($theme->settings_css);
        $this->assertEquals(':root { --custom: red; }', $theme->settings_css);

        $this->assertNotNull($theme->header_css);
        $this->assertEquals('.header { color: blue; }', $theme->header_css);

        $this->assertNotNull($theme->footer_css);
        $this->assertEquals('.footer { color: green; }', $theme->footer_css);

        // Assert: Verify columns exist in database
        $this->assertDatabaseHas('themes', [
            'id' => $theme->id,
            'settings_css' => ':root { --custom: red; }',
            'header_css' => '.header { color: blue; }',
            'footer_css' => '.footer { color: green; }',
        ]);
    }
}
