<?php

namespace App\Observers;

use App\Models\ThemePart;
use App\Models\Page;
use App\Services\PuckCompilerService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ThemePartObserver
{
    /**
     * Handle the ThemePart "updated" event.
     */
    public function updated(ThemePart $themePart): void
    {
        // Only recompile if the theme part is published
        if ($themePart->status === 'published') {
            $this->recompilePagesUsingThemePart($themePart);
        }
    }

    /**
     * Handle the ThemePart "deleted" event.
     */
    public function deleted(ThemePart $themePart): void
    {
        $this->recompilePagesUsingThemePart($themePart);
    }

    /**
     * Recompile all published pages that use this theme part as header or footer.
     */
    protected function recompilePagesUsingThemePart(ThemePart $themePart): void
    {
        // Clear metadata cache for this tenant
        Cache::forget("page_metadata_{$themePart->tenant_id}");

        $compiler = app(PuckCompilerService::class);
        $pagesRecompiled = 0;

        // Find pages using this theme part as header or footer
        $query = Page::where('tenant_id', $themePart->tenant_id)
            ->where('status', 'published')
            ->whereNotNull('puck_data')
            ->where(function ($q) use ($themePart) {
                $q->where('header_id', $themePart->id)
                  ->orWhere('footer_id', $themePart->id);
            });

        $query->chunk(50, function ($pages) use ($compiler, &$pagesRecompiled) {
            foreach ($pages as $page) {
                $page->puck_data_compiled = $compiler->compilePage($page);
                $page->save();
                $pagesRecompiled++;
            }
        });

        if ($pagesRecompiled > 0) {
            Log::info("Recompiled {$pagesRecompiled} pages after theme part change", [
                'theme_part_id' => $themePart->id,
                'theme_part_name' => $themePart->name,
                'tenant_id' => $themePart->tenant_id,
            ]);
        }
    }
}
