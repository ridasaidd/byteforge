<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        return response()->json(['message' => 'Route tenant.info works']);
    }

    /**
     * Get tenant dashboard data
     */
    public function dashboard(): JsonResponse
    {
        return response()->json(['message' => 'Route tenant.dashboard works']);
    }
}