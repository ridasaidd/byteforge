<?php

namespace Tests\Feature\Services;

use App\Models\Theme;
use App\Models\ThemePart;
use App\Models\ThemePlaceholder;
use App\Services\ThemeService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ThemeServiceTest extends TestCase
{
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

        // Act: Activate the system theme for the tenant — a tenant-owned clone is created.
        $activeTheme = $this->themeService->activateTheme('test-theme', $tenantId);

        // Assert: A tenant-scoped clone is returned and is active.
        $this->assertNotNull($activeTheme);
        $this->assertEquals($tenantId, $activeTheme->tenant_id);
        $this->assertTrue($activeTheme->is_active);

        // Assert: Placeholders copied to ThemeParts scoped to the clone.

        // Header Part
        $headerPart = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $activeTheme->id)
            ->where('type', 'header')
            ->first();

        $this->assertNotNull($headerPart, 'Header part was not created for tenant.');
        $this->assertEquals(['root' => [], 'content' => ['header_stuff']], $headerPart->puck_data_raw);

        // Footer Part
        $footerPart = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $activeTheme->id)
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

        // First activation - creates tenant clone + parts
        $cloned = $this->themeService->activateTheme('test-theme', $tenantId);

        // Modify the tenant clone's header part
        $headerPart = ThemePart::where('tenant_id', $tenantId)
            ->where('theme_id', $cloned->id)
            ->where('type', 'header')
            ->first();
        $headerPart->puck_data_raw = ['root' => [], 'content' => ['customized_header']];
        $headerPart->save();

        // Reactivate — should re-use existing clone, not create a new one
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

        // Activate for both tenants — each gets their own clone.
        $clone1 = $this->themeService->activateTheme('test-theme', $tenant1Id);
        $clone2 = $this->themeService->activateTheme('test-theme', $tenant2Id);

        // Modify tenant1's header (on clone1)
        $headerPart1 = ThemePart::where('tenant_id', $tenant1Id)
            ->where('theme_id', $clone1->id)
            ->where('type', 'header')
            ->first();
        $headerPart1->puck_data_raw = ['root' => [], 'content' => ['tenant1_custom']];
        $headerPart1->save();

        // Assert: Tenant2's header (on clone2) is unchanged
        $headerPart2 = ThemePart::where('tenant_id', $tenant2Id)
            ->where('theme_id', $clone2->id)
            ->where('type', 'header')
            ->first();

        $this->assertEquals(['root' => [], 'content' => ['header_stuff']], $headerPart2->puck_data_raw);
        $this->assertNotEquals($headerPart1->puck_data_raw, $headerPart2->puck_data_raw);
    }

    #[Test]
    public function it_returns_empty_templates_list_safely_when_no_theme_available()
    {
        // Ensure the setup theme isn't used as fallback
        $this->theme->is_system_theme = false;
        $this->theme->save();

        // Ensure no other themes interfering
        Theme::where('id', '!=', $this->theme->id)->delete();

        $templates = $this->themeService->getTemplatesFromActiveTheme('some-random-tenant');

        $this->assertIsArray($templates);
        $this->assertEmpty($templates);
    }

    #[Test]
    public function it_returns_system_templates_to_tenant_users()
    {
        // 1. Setup: Activate the system theme for the tenant — clone is returned.
        $tenantId = $this->getTenant('tenant-one')->id;
        $cloned = $this->themeService->activateTheme($this->theme->slug, $tenantId);

        // 2. Setup: Create a template on the tenant clone (tenant-scoped).
        \App\Models\PageTemplate::create([
            'tenant_id' => $tenantId,
            'theme_id' => $cloned->id,
            'name' => 'System Homepage',
            'slug' => 'system-home',
            'category' => 'general',
            'is_active' => true,
            'puck_data' => ['content' => []]
        ]);

        // 3. Act: Get templates for the tenant
        $results = $this->themeService->getTemplatesFromActiveTheme($tenantId);

        // 4. Assert: The template is returned
        $this->assertCount(1, $results);
        $this->assertEquals('System Homepage', $results[0]['name']);
    }

    #[Test]
    public function it_returns_tenant_specific_templates_to_tenant_users()
    {
        // 1. Setup: Activate the system theme for the tenant — clone is returned.
        $tenantId = $this->getTenant('tenant-one')->id;
        $cloned = $this->themeService->activateTheme($this->theme->slug, $tenantId);

        // 2. Setup: Create a tenant-specific template on the clone.
        \App\Models\PageTemplate::create([
            'tenant_id' => $tenantId,
            'theme_id' => $cloned->id,
            'name' => 'My Custom Landing',
            'slug' => 'custom-landing',
            'category' => 'landing',
            'is_active' => true,
            'puck_data' => ['content' => []]
        ]);

        // 3. Act: Get templates for the tenant
        $results = $this->themeService->getTemplatesFromActiveTheme($tenantId);

        // 4. Assert: The tenant template is returned
        $this->assertCount(1, $results);
        $this->assertEquals('My Custom Landing', $results[0]['name']);
    }
}
