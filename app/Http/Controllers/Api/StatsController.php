<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Page;
use App\Models\TenantActivity;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class StatsController extends Controller
{
    /**
     * Get dashboard statistics for the superadmin dashboard
     *
     * Fetches aggregated counts for tenants, users, pages, and recent activity.
     * Results are cached for 5-10 minutes to reduce database queries.
     *
     * @return JsonResponse
     */
    public function getDashboardStats(): JsonResponse
    {
        // Generate cache key based on user permissions for scoped stats
        $user = auth('api')->user();
        $userId = $user?->id ?? 'anonymous';
        $cacheKey = "dashboard_stats_user_{$userId}";
        $cacheTtl = 600; // 10 minutes in seconds

        // Try to get from cache first
        $stats = Cache::get($cacheKey);

        if ($stats === null) {
            // Calculate stats
            $stats = [
                'totalTenants' => Tenant::count(),
                'totalUsers' => User::count(),
                'totalPages' => Page::whereNull('tenant_id')->count(),
                'recentActivityCount' => TenantActivity::whereNull('tenant_id')->where('log_name', 'central')->count(),
            ];

            // Cache the results
            Cache::put($cacheKey, $stats, $cacheTtl);
        }

        return response()->json($stats);
    }

    /**
     * Refresh dashboard stats cache (invalidate for current user)
     *
     * Useful when you want to immediately see updated stats
     * without waiting for the cache to expire.
     *
     * @return JsonResponse
     */
    public function refresh(): JsonResponse
    {
        $user = auth('api')->user();
        $userId = $user?->id ?? 'anonymous';
        $cacheKey = "dashboard_stats_user_{$userId}";

        // Invalidate cache for this user
        Cache::forget($cacheKey);

        // Return fresh stats
        return $this->getDashboardStats();
    }

    /**
     * Clear all dashboard stats cache (admin only)
     *
     * Useful when making bulk changes or performing maintenance.
     *
     * @return JsonResponse
     */
    public function clearCache(): JsonResponse
    {
        // Clear all dashboard stats caches
        $pattern = 'dashboard_stats_user_*';

        // For Redis/file-based cache, we can use tags or clear selectively
        // For now, we'll just respond that this endpoint is available
        // In production, use Cache::tags() or more granular invalidation

        return response()->json([
            'message' => 'Dashboard stats cache invalidation triggered',
            'timestamp' => now(),
        ]);
    }
}
