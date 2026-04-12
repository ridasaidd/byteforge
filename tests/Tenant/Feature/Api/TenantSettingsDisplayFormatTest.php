<?php

namespace Tests\Tenant\Feature\Api;

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
}
