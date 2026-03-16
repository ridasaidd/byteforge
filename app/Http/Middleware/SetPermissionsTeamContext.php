<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class SetPermissionsTeamContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (tenancy()->initialized && tenancy()->tenant) {
            app(PermissionRegistrar::class)->setPermissionsTeamId((string) tenancy()->tenant->id);
        } else {
            app(PermissionRegistrar::class)->setPermissionsTeamId(null);
        }

        try {
            return $next($request);
        } finally {
            app(PermissionRegistrar::class)->setPermissionsTeamId(null);
        }
    }
}
