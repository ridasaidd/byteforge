<?php

namespace App\Actions\Api\Superadmin;

use Lorisleiva\Actions\Concerns\AsAction;

class SyncThemesAction
{
    use AsAction;

    public function handle()
    {
        app(\App\Services\ThemeService::class)->syncThemesFromDisk();
    }
}
