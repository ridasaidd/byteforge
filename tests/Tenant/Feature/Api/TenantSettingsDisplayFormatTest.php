<?php

namespace Tests\Tenant\Feature\Api;

use App\Settings\TenantSettings;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantSettingsDisplayFormatTest extends TestCase
{
    private function tenantUrl(string $path, string $tenantSlug = 'tenant-one'): string
    {
        $tenant = TestUsers::tenant($tenantSlug);
        $domain = $tenant->domains()->first()?->domain ?? "{$tenantSlug}.byteforge.se";

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function owner_can_round_trip_display_format_settings(): void
    {
        $this->actingAsTenantOwner('tenant-one');

        $getBefore = $this->getJson($this->tenantUrl('/api/settings', 'tenant-one'));
        $getBefore->assertOk();

        $originalDateFormat = (string) $getBefore->json('data.date_format');
        $originalTimeFormat = (string) $getBefore->json('data.time_format');

        $targetDateFormat = $originalDateFormat === 'dd/MM/yyyy' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
        $targetTimeFormat = $originalTimeFormat === 'h:mm aa' ? 'HH:mm' : 'h:mm aa';

        try {
            $update = $this->putJson($this->tenantUrl('/api/settings', 'tenant-one'), [
                'date_format' => $targetDateFormat,
                'time_format' => $targetTimeFormat,
            ]);

            $update->assertOk()
                ->assertJsonPath('data.date_format', $targetDateFormat)
                ->assertJsonPath('data.time_format', $targetTimeFormat);

            $getAfter = $this->getJson($this->tenantUrl('/api/settings', 'tenant-one'));
            $getAfter->assertOk()
                ->assertJsonPath('data.date_format', $targetDateFormat)
                ->assertJsonPath('data.time_format', $targetTimeFormat);
        } finally {
            $this->putJson($this->tenantUrl('/api/settings', 'tenant-one'), [
                'date_format' => $originalDateFormat,
                'time_format' => $originalTimeFormat,
            ])->assertOk();
        }
    }

    #[Test]
    public function owner_update_normalizes_site_title_and_description(): void
    {
        $this->actingAsTenantOwner('tenant-one');

        $getBefore = $this->getJson($this->tenantUrl('/api/settings', 'tenant-one'));
        $getBefore->assertOk();

        $originalSiteTitle = $getBefore->json('data.site_title');
        $originalSiteDescription = $getBefore->json('data.site_description');

        try {
            $update = $this->putJson($this->tenantUrl('/api/settings', 'tenant-one'), [
                'site_title' => '  <b>Tenant   One</b>  ',
                'site_description' => "\n<p>Friendly storefront.</p>\r\nBuilt for appointments.\t",
            ]);

            $update->assertOk()
                ->assertJsonPath('data.site_title', 'Tenant One')
                ->assertJsonPath('data.site_description', "Friendly storefront.\nBuilt for appointments.");

            $getAfter = $this->getJson($this->tenantUrl('/api/settings', 'tenant-one'));
            $getAfter->assertOk()
                ->assertJsonPath('data.site_title', 'Tenant One')
                ->assertJsonPath('data.site_description', "Friendly storefront.\nBuilt for appointments.");
        } finally {
            $settings = app(TenantSettings::class);
            $settings->site_title = is_string($originalSiteTitle) ? $originalSiteTitle : '';
            $settings->site_description = is_string($originalSiteDescription) ? $originalSiteDescription : null;
            $settings->save();
        }
    }
}
