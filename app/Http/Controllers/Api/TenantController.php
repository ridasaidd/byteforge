<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

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
