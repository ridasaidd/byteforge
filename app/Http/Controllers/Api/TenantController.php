<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Actions\Api\Tenant\TenantInfoAction;
use App\Models\Page;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class TenantController extends Controller
{
    /**
     * Get tenant information
     */
    public function info(): JsonResponse
    {
        $action = new TenantInfoAction();
        $result = $action->execute();

        return response()->json($result);
    }

    /**
     * Get tenant dashboard data
     */
    public function dashboard(): JsonResponse
    {
        $action = new TenantInfoAction();
        $tenantInfo = $action->execute();

        // Add additional dashboard data
        $dashboard = [
            'tenant' => $tenantInfo,
            'stats' => [
                'total_pages' => Page::where('tenant_id', tenancy()->tenant->id)->count(),
                'published_pages' => Page::where('tenant_id', tenancy()->tenant->id)->where('status', 'published')->count(),
                'total_users' => User::whereHas('memberships', function ($query) {
                    $query->where('tenant_id', tenancy()->tenant->id);
                })->count(),
            ],
        ];

        return response()->json($dashboard);
    }
}
