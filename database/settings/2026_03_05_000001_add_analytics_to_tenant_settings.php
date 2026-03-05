<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('tenant.ga4_measurement_id', null);
        $this->migrator->add('tenant.gtm_container_id', null);
        $this->migrator->add('tenant.clarity_project_id', null);
        $this->migrator->add('tenant.plausible_domain', null);
        $this->migrator->add('tenant.meta_pixel_id', null);
    }
};
