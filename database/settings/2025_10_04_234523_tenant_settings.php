<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // These will be created per tenant, so we don't seed defaults here
        // They will be created when a tenant is provisioned
        $this->migrator->add('tenant.tenant_id', '');
        $this->migrator->add('tenant.site_title', '');
        $this->migrator->add('tenant.site_description', null);
        $this->migrator->add('tenant.logo_url', null);
        $this->migrator->add('tenant.favicon_url', null);
        $this->migrator->add('tenant.maintenance_mode', false);
        $this->migrator->add('tenant.social_links', []);
        $this->migrator->add('tenant.seo_meta', []);
    }
};
