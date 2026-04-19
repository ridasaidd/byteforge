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

    // Phase 9.6 — Third-party analytics integrations
    public ?string $ga4_measurement_id;

    public ?string $gtm_container_id;

    public ?string $clarity_project_id;

    public ?string $plausible_domain;

    public ?string $meta_pixel_id;

    // Phase 13 — Cookie consent and legal policy controls
    public ?string $privacy_policy_url;

    public ?string $cookie_policy_url;

    // Phase 13 — Booking system
    public string $timezone;

    /** date-fns date format string, e.g. 'yyyy-MM-dd' or 'dd/MM/yyyy' */
    public string $date_format;

    /** date-fns time format string: 'HH:mm' (24h) or 'h:mm aa' (12h) */
    public string $time_format;

    public bool $booking_auto_confirm;

    /** @var int[] */
    public array $booking_reminder_hours;

    public int $booking_cancellation_notice_hours;

    public int $booking_hold_minutes;

    public string $booking_checkin_time;

    public string $booking_checkout_time;

    public ?int $booking_payment_page_id;

    public bool $ga4_enabled;

    public bool $gtm_enabled;

    public bool $clarity_enabled;

    public bool $plausible_enabled;

    public bool $meta_pixel_enabled;

    public static function group(): string
    {
        return 'tenant';
    }
}
