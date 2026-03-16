<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Models\Navigation;
use App\Models\Page;
use App\Models\TenantActivity;
use Illuminate\Http\JsonResponse;

class TenantController extends Controller
{
    /**
     * Get tenant information
     */
    public function info(): JsonResponse
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            return response()->json([
                'message' => 'Tenant not resolved',
            ], 404);
        }

        return response()->json([
            'id' => tenancy()->tenant->id,
            'name' => tenancy()->tenant->name,
            'slug' => tenancy()->tenant->slug,
        ]);
    }

    /**
     * Get tenant dashboard data
     */
    public function dashboard(): JsonResponse
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            return response()->json([
                'message' => 'Tenant not resolved',
            ], 404);
        }

        $tenantId = (string) tenancy()->tenant->id;

        $stats = [
            'totalPages' => Page::query()->where('tenant_id', $tenantId)->count(),
            'publishedPages' => Page::query()->where('tenant_id', $tenantId)->where('status', 'published')->count(),
            'mediaFiles' => Media::query()->count(),
            'menuItems' => Navigation::query()->where('tenant_id', $tenantId)->count(),
            'recentActivityCount' => TenantActivity::query()->forTenant($tenantId)->count(),
        ];

        return response()->json($stats);
    }
}
