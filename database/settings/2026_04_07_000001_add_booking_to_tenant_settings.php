<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // Phase 13 — Booking system tenant settings
        $this->migrator->add('tenant.timezone', 'Europe/Stockholm');
        $this->migrator->add('tenant.booking_auto_confirm', true);
        $this->migrator->add('tenant.booking_reminder_hours', [24, 1]);
        $this->migrator->add('tenant.booking_cancellation_notice_hours', 0);
        $this->migrator->add('tenant.booking_hold_minutes', 10);
        $this->migrator->add('tenant.booking_checkin_time', '15:00');
        $this->migrator->add('tenant.booking_checkout_time', '11:00');
    }
};
