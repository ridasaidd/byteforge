<?php

namespace Tests\Feature\Api;

use App\Settings\GeneralSettings;
use Tests\TestCase;

class SuperadminSettingsTest extends TestCase
{
    public function test_can_update_settings_with_normalized_human_text_fields(): void
    {
        $settings = app(GeneralSettings::class);
        $settings->site_name = 'ByteForge';
        $settings->site_active = true;
        $settings->support_email = 'support@example.com';
        $settings->company_name = 'ByteForge AB';
        $settings->max_tenants_per_user = 5;
        $settings->ga4_measurement_id = null;
        $settings->gtm_container_id = null;
        $settings->clarity_project_id = null;
        $settings->plausible_domain = null;
        $settings->meta_pixel_id = null;
        $settings->privacy_policy_url = null;
        $settings->cookie_policy_url = null;
        $settings->ga4_enabled = false;
        $settings->gtm_enabled = false;
        $settings->clarity_enabled = false;
        $settings->plausible_enabled = false;
        $settings->meta_pixel_enabled = false;
        $settings->save();

        $response = $this->actingAsSuperadmin()->putJson('/api/superadmin/settings', [
            'site_name' => '  <b>Byte   Forge</b>  ',
            'support_email' => "  SUPPORT@example.com\t",
            'company_name' => '  <i>ByteForge   AB</i>  ',
            'site_active' => true,
            'max_tenants_per_user' => 5,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.site_name', 'Byte Forge')
            ->assertJsonPath('data.support_email', 'SUPPORT@example.com')
            ->assertJsonPath('data.company_name', 'ByteForge AB');

        $settings = app(GeneralSettings::class);

        $this->assertSame('Byte Forge', $settings->site_name);
        $this->assertSame('SUPPORT@example.com', $settings->support_email);
        $this->assertSame('ByteForge AB', $settings->company_name);
    }
}
