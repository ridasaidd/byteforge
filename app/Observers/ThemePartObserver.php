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
        // Only recompile if it's a header or footer
        if (!in_array($themePart->type, ['header', 'footer'])) {
            return;
        }

        // Clear metadata cache for this tenant
        Cache::forget("page_metadata_{$themePart->tenant_id}");

        // Check if the theme this part belongs to is active
        $isActiveTheme = \App\Models\Theme::where('id', $themePart->theme_id)
            ->where('is_active', true)
            ->exists();

        if (!$isActiveTheme) {
            return;
        }

        $compiler = app(PuckCompilerService::class);
        $pagesRecompiled = 0;

        // Find all published pages for this tenant
        // Since we removed explicit header_id/footer_id from pages,
        // we assume all pages use the active theme's header/footer.
        $query = Page::where('tenant_id', $themePart->tenant_id)
            ->where('status', 'published')
            ->whereNotNull('puck_data');

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
