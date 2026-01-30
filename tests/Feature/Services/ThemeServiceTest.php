<?php

namespace Tests\Feature\Services;

use App\Models\Theme;
use App\Models\ThemePart;
use App\Models\ThemePlaceholder;
use App\Models\User;
use App\Services\ThemeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ThemeServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ThemeService $themeService;
    protected Theme $theme;

    protected function setUp(): void
    {
        parent::setUp();

        $this->themeService = $this->app->make(ThemeService::class);

        // Create a theme (blueprint) with placeholders
        $this->theme = Theme::factory()->create([
            'is_system_theme' => true,
            'tenant_id' => null,
            'name' => 'Test Theme',
            'slug' => 'test-theme'
        ]);

        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'header',
            'content' => ['root' => [], 'content' => ['header_stuff']]
        ]);

        ThemePlaceholder::create([
            'theme_id' => $this->theme->id,
            'type' => 'footer',
            'content' => ['root' => [], 'content' => ['footer_stuff']]
        ]);
    }

    #[Test]
    public function it_copies_placeholders_to_parts_on_activation_for_tenant()
    {
        $tenantId = $this->getTenant('tenant-one')->id;

        // Act: Activate the theme for the tenant
        $activeTheme = $this->themeService->activateTheme('test-theme', $tenantId);

        // Assert: Same theme is returned (not cloned)
        $this->assertNotNull($activeTheme);
        $this->assertEquals($this->theme->id, $activeTheme->id);
        $this->assertTrue($activeTheme->is_active);

        // Assert: Placeholders copied to ThemeParts for tenant scope

        // Header Part
        $headerPart = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();

        $this->assertNotNull($headerPart, 'Header part was not created for tenant.');
        $this->assertEquals(['root' => [], 'content' => ['header_stuff']], $headerPart->puck_data_raw);

        // Footer Part
        $footerPart = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $this->theme->id)
            ->where('type', 'footer')
            ->first();

        $this->assertNotNull($footerPart, 'Footer part was not created for tenant.');
        $this->assertEquals(['root' => [], 'content' => ['footer_stuff']], $footerPart->puck_data_raw);
    }

    #[Test]
    public function it_copies_placeholders_to_parts_on_activation_for_central()
    {
        // Act: Activate the theme for central (null tenant)
        $activeTheme = $this->themeService->activateTheme('test-theme', null);

        // Assert: Same theme is returned (not cloned)
        $this->assertNotNull($activeTheme);
        $this->assertEquals($this->theme->id, $activeTheme->id);
        $this->assertTrue($activeTheme->is_active);

        // Assert: Placeholders copied to ThemeParts for central scope (tenant_id = null)

        // Header Part
        $headerPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();

        $this->assertNotNull($headerPart, 'Header part was not created for central.');
        $this->assertEquals(['root' => [], 'content' => ['header_stuff']], $headerPart->puck_data_raw);

        // Footer Part
        $footerPart = ThemePart::whereNull('tenant_id')
            ->where('theme_id', $this->theme->id)
            ->where('type', 'footer')
            ->first();

        $this->assertNotNull($footerPart, 'Footer part was not created for central.');
        $this->assertEquals(['root' => [], 'content' => ['footer_stuff']], $footerPart->puck_data_raw);
    }

    #[Test]
    public function it_does_not_overwrite_existing_parts_on_reactivation()
    {
        $tenantId = $this->getTenant('tenant-one')->id;

        // First activation - creates parts
        $this->themeService->activateTheme('test-theme', $tenantId);

        // Modify the tenant's header part
        $headerPart = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();
        $headerPart->puck_data_raw = ['root' => [], 'content' => ['customized_header']];
        $headerPart->save();

        // Reactivate the theme
        $this->themeService->activateTheme('test-theme', $tenantId);

        // Assert: Customized content is preserved (not overwritten)
        $headerPart->refresh();
        $this->assertEquals(['root' => [], 'content' => ['customized_header']], $headerPart->puck_data_raw);
    }

    #[Test]
    public function each_tenant_gets_isolated_theme_parts()
    {
        $tenant1Id = $this->getTenant('tenant-one')->id;
        $tenant2Id = $this->getTenant('tenant-two')->id;

        // Activate for both tenants
        $this->themeService->activateTheme('test-theme', $tenant1Id);
        $this->themeService->activateTheme('test-theme', $tenant2Id);

        // Modify tenant1's header
        $headerPart1 = ThemePart::where('tenant_id', $tenant1Id)
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();
        $headerPart1->puck_data_raw = ['root' => [], 'content' => ['tenant1_custom']];
        $headerPart1->save();

        // Assert: Tenant2's header is unchanged
        $headerPart2 = ThemePart::where('tenant_id', $tenant2Id)
            ->where('theme_id', $this->theme->id)
            ->where('type', 'header')
            ->first();

        $this->assertEquals(['root' => [], 'content' => ['header_stuff']], $headerPart2->puck_data_raw);
        $this->assertNotEquals($headerPart1->puck_data_raw, $headerPart2->puck_data_raw);
    }
}
