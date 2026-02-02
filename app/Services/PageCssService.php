<?php

namespace App\Services;

use App\Models\Page;
use Illuminate\Support\Facades\Cache;

class PageCssService
{
    /**
     * Get merged CSS from all published pages for a tenant
     * Uses caching to avoid repeated database queries
     *
     * @param string|null $tenantId
     * @return string Merged CSS from all published pages
     */
    public function getMergedPagesCss(?string $tenantId): string
    {
        $cacheKey = $this->getCacheKey($tenantId);

        return Cache::remember($cacheKey, 3600, function () use ($tenantId) {
            return $this->fetchAndMergePagesCss($tenantId);
        });
    }

    /**
     * Fetch and merge CSS from all published pages
     *
     * @param string|null $tenantId
     * @return string
     */
    protected function fetchAndMergePagesCss(?string $tenantId): string
    {
        $query = $tenantId === null
            ? Page::whereNull('tenant_id')
            : Page::where('tenant_id', $tenantId);

        $pagesCss = $query
            ->where('status', 'published')
            ->whereNotNull('page_css')
            ->pluck('page_css')
            ->filter() // Remove empty/null values
            ->join("\n\n");

        return trim($pagesCss);
    }

    /**
     * Invalidate the cached pages CSS for a tenant
     *
     * @param string|null $tenantId
     * @return void
     */
    public function invalidateCache(?string $tenantId): void
    {
        $cacheKey = $this->getCacheKey($tenantId);
        Cache::forget($cacheKey);
    }

    /**
     * Get cache key for tenant pages CSS
     *
     * @param string|null $tenantId
     * @return string
     */
    protected function getCacheKey(?string $tenantId): string
    {
        $tenantKey = $tenantId ?? 'central';
        return "pages-css-merged-{$tenantKey}";
    }

    /**
     * Get cache tags for tenant pages CSS
     *
     * @param string|null $tenantId
     * @return array
     */
    protected function getCacheTags(?string $tenantId): array
    {
        $tenantKey = $tenantId ?? 'central';
        return ["tenant:{$tenantKey}", 'pages-css'];
    }
}
