<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class GeneralSettings extends Settings
{
    public string $site_name;

    public bool $site_active;

    public ?string $support_email;

    public ?string $company_name;

    public int $max_tenants_per_user;

    public static function group(): string
    {
        return 'general';
    }
}
