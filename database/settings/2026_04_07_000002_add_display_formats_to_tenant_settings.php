<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // 'HH:mm' = 24-hour (European default), 'h:mm aa' = 12-hour AM/PM
        $this->migrator->add('tenant.time_format', 'HH:mm');
        // date-fns format strings; defaults to ISO (YYYY-MM-DD)
        $this->migrator->add('tenant.date_format', 'yyyy-MM-dd');
    }
};
