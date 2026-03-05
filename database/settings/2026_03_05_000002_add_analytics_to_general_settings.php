<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('general.ga4_measurement_id', null);
        $this->migrator->add('general.gtm_container_id', null);
        $this->migrator->add('general.clarity_project_id', null);
        $this->migrator->add('general.plausible_domain', null);
        $this->migrator->add('general.meta_pixel_id', null);
    }
};
