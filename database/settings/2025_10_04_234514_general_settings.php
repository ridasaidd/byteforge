<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('general.site_name', 'ByteForge');
        $this->migrator->add('general.site_active', true);
        $this->migrator->add('general.support_email', 'support@byteforge.com');
        $this->migrator->add('general.company_name', 'ByteForge Inc.');
        $this->migrator->add('general.max_tenants_per_user', 5);
    }
};
