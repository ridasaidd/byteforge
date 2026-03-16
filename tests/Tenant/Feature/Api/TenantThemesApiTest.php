<?php

namespace Tests\Tenant\Feature\Api;

use App\Models\Theme;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantThemesApiTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function active_theme_endpoint_is_read_only_and_does_not_auto_activate_default_theme(): void
    {
        $tenantId = TestUsers::tenant('tenant-one')->id;

        Theme::query()->where('tenant_id', $tenantId)->update(['is_active' => false]);
        Theme::query()->whereNull('tenant_id')->update(['is_active' => false]);

        $firstTheme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'slug' => 'tenant-system-a',
        ]);

        $secondTheme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'slug' => 'tenant-system-b',
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/themes/active', 'tenant-one'));

        $response->assertNotFound();

        $this->assertDatabaseHas('themes', ['id' => $firstTheme->id, 'is_active' => false]);
        $this->assertDatabaseHas('themes', ['id' => $secondTheme->id, 'is_active' => false]);
    }

    #[Test]
    public function tenant_themes_list_includes_system_themes_and_excludes_other_tenant_themes(): void
    {
        $tenantOneId = TestUsers::tenant('tenant-one')->id;
        $tenantTwoId = TestUsers::tenant('tenant-two')->id;

        $systemTheme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'slug' => 'tenant-list-system',
        ]);

        Theme::factory()->create([
            'tenant_id' => $tenantTwoId,
            'is_system_theme' => false,
            'slug' => 'tenant-two-private-theme',
        ]);

        Theme::factory()->create([
            'tenant_id' => $tenantOneId,
            'is_system_theme' => false,
            'slug' => 'tenant-one-private-theme',
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/themes', 'tenant-one'));

        $response->assertOk();

        $slugs = collect($response->json('data'))->pluck('slug')->all();

        $this->assertContains($systemTheme->slug, $slugs);
        $this->assertContains('tenant-one-private-theme', $slugs);
        $this->assertNotContains('tenant-two-private-theme', $slugs);
    }

    #[Test]
    public function tenant_themes_list_marks_current_tenant_active_theme(): void
    {
        $tenantOneId = TestUsers::tenant('tenant-one')->id;

        Theme::query()->where('tenant_id', $tenantOneId)->update(['is_active' => false]);

        $activeTenantTheme = Theme::factory()->create([
            'tenant_id' => $tenantOneId,
            'is_system_theme' => false,
            'is_active' => true,
            'slug' => 'tenant-active-theme',
        ]);

        $inactiveSystemTheme = Theme::factory()->create([
            'tenant_id' => null,
            'is_system_theme' => true,
            'is_active' => false,
            'slug' => 'tenant-inactive-system-theme',
        ]);

        $response = $this->actingAsTenantOwner('tenant-one')
            ->getJson($this->tenantUrl('/api/themes', 'tenant-one'));

        $response->assertOk();

        $themesBySlug = collect($response->json('data'))->keyBy('slug');

        $this->assertTrue((bool) ($themesBySlug[$activeTenantTheme->slug]['is_active'] ?? false));
        $this->assertFalse((bool) ($themesBySlug[$inactiveSystemTheme->slug]['is_active'] ?? true));
    }
}
