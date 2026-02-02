<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PageCssService;
use Illuminate\Http\Response;

class PageCssController extends Controller
{
    public function __construct(
        private PageCssService $pageCssService
    ) {
    }

    /**
     * Get merged CSS from all published pages
     * Returns plain CSS text with proper headers for browser caching
     *
     * GET /api/pages/css (for central pages)
     * GET /api/tenant/pages/css (for tenant pages)
     */
    public function getMergedCss(): Response
    {
        $tenantId = $this->getTenantId();
        $css = $this->pageCssService->getMergedPagesCss($tenantId);

        return response($css, 200)
            ->header('Content-Type', 'text/css')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    /**
     * Get tenant ID - uses null for central app, or tenant ID for tenant context
     */
    private function getTenantId(): ?string
    {
        // Check if we're in tenant context
        if (tenancy()->initialized) {
            return tenancy()->tenant->id;
        }

        // Central context - use null for central pages
        return null;
    }
}
