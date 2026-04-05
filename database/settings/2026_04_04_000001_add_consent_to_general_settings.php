<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // Cookie policy links
        $this->migrator->add('general.privacy_policy_url', null);
        $this->migrator->add('general.cookie_policy_url', null);

        // Per-provider enable flags (separate from provider ID — allows temporarily
        // disabling a provider without losing its configuration)
        $this->migrator->add('general.ga4_enabled', false);
        $this->migrator->add('general.gtm_enabled', false);
        $this->migrator->add('general.clarity_enabled', false);
        $this->migrator->add('general.plausible_enabled', false);
        $this->migrator->add('general.meta_pixel_enabled', false);
    }
};
