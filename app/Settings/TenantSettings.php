<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class TenantSettings extends Settings
{
    public string $tenant_id;
    public string $site_title;
    public ?string $site_description;
    public ?string $logo_url;
    public ?string $favicon_url;
    public bool $maintenance_mode;
    public array $social_links;
    public array $seo_meta;

    public static function group(): string
    {
        return 'tenant';
    }
}
