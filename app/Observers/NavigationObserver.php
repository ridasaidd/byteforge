<?php

namespace App\Observers;

use App\Models\Navigation;
use App\Models\Page;
use App\Services\PuckCompilerService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class NavigationObserver
{
    /**
     * Handle the Navigation "created" event.
     */
    public function created(Navigation $navigation): void
    {
        $this->recompilePages($navigation->tenant_id);
    }

    /**
     * Handle the Navigation "updated" event.
     */
    public function updated(Navigation $navigation): void
    {
        $this->recompilePages($navigation->tenant_id);
    }

    /**
     * Handle the Navigation "deleted" event.
     */
    public function deleted(Navigation $navigation): void
    {
        $this->recompilePages($navigation->tenant_id);
    }

    /**
     * Recompile all published pages for a tenant.
     *
     * This is triggered when navigation changes to ensure published pages
     * have the latest navigation data in their compiled JSON.
     */
    protected function recompilePages(?string $tenantId): void
    {
        // Clear metadata cache so next compilation fetches fresh data
        Cache::forget("page_metadata_{$tenantId}");

        // Recompile all published pages for this tenant
        $compiler = app(PuckCompilerService::class);

        $pagesRecompiled = 0;

        Page::where('tenant_id', $tenantId)
            ->where('status', 'published')
            ->whereNotNull('puck_data')
            ->chunk(50, function ($pages) use ($compiler, &$pagesRecompiled) {
                foreach ($pages as $page) {
                    $page->puck_data_compiled = $compiler->compilePage($page);
                    $page->save();
                    $pagesRecompiled++;
                }
            });

        if ($pagesRecompiled > 0) {
            Log::info("Recompiled {$pagesRecompiled} pages after navigation change", [
                'tenant_id' => $tenantId,
            ]);
        }
    }
}
