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

    // Phase 9.6 — Third-party analytics integrations (central/dogfood)
    public ?string $ga4_measurement_id;

    public ?string $gtm_container_id;

    public ?string $clarity_project_id;

    public ?string $plausible_domain;

    public ?string $meta_pixel_id;

    // Phase 13 — Cookie consent and legal policy controls
    public ?string $privacy_policy_url;

    public ?string $cookie_policy_url;

    public bool $ga4_enabled;

    public bool $gtm_enabled;

    public bool $clarity_enabled;

    public bool $plausible_enabled;

    public bool $meta_pixel_enabled;

    public static function group(): string
    {
        return 'general';
    }
}
