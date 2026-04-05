<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // Cookie policy links
        $this->migrator->add('tenant.privacy_policy_url', null);
        $this->migrator->add('tenant.cookie_policy_url', null);

        // Per-provider enable flags
        $this->migrator->add('tenant.ga4_enabled', false);
        $this->migrator->add('tenant.gtm_enabled', false);
        $this->migrator->add('tenant.clarity_enabled', false);
        $this->migrator->add('tenant.plausible_enabled', false);
        $this->migrator->add('tenant.meta_pixel_enabled', false);
    }
};
