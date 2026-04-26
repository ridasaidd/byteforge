<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SystemSurface;

class SystemSurfaceProvisioningService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function defaults(): array
    {
        return [
            [
                'surface_key' => SystemSurface::KEY_TENANT_LOGIN,
                'title' => 'Login',
                'route_path' => '/login',
                'surface_type' => SystemSurface::TYPE_AUTH,
                'puck_data' => null,
                'settings' => [],
                'is_enabled' => true,
                'sort_order' => 10,
                'published_at' => null,
            ],
            [
                'surface_key' => SystemSurface::KEY_REGISTER,
                'title' => 'Register',
                'route_path' => '/register',
                'surface_type' => SystemSurface::TYPE_AUTH,
                'puck_data' => null,
                'settings' => [],
                'is_enabled' => true,
                'sort_order' => 20,
                'published_at' => null,
            ],
            [
                'surface_key' => SystemSurface::KEY_FORGOT_PASSWORD,
                'title' => 'Forgot Password',
                'route_path' => '/forgot-password',
                'surface_type' => SystemSurface::TYPE_AUTH,
                'puck_data' => null,
                'settings' => [],
                'is_enabled' => true,
                'sort_order' => 30,
                'published_at' => null,
            ],
            [
                'surface_key' => SystemSurface::KEY_RESET_PASSWORD,
                'title' => 'Reset Password',
                'route_path' => '/reset-password/:token',
                'surface_type' => SystemSurface::TYPE_AUTH,
                'puck_data' => null,
                'settings' => [],
                'is_enabled' => true,
                'sort_order' => 40,
                'published_at' => null,
            ],
            [
                'surface_key' => SystemSurface::KEY_GUEST_PORTAL,
                'title' => 'Guest Portal',
                'route_path' => '/guest-portal',
                'surface_type' => SystemSurface::TYPE_GUEST_PORTAL,
                'puck_data' => null,
                'settings' => [],
                'is_enabled' => true,
                'sort_order' => 50,
                'published_at' => null,
            ],
        ];
    }

    public function ensureTenantDefaults(string $tenantId): void
    {
        foreach ($this->defaults() as $surface) {
            $record = SystemSurface::query()->firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'surface_key' => $surface['surface_key'],
                ],
                $surface,
            );

            $record->fill([
                'route_path' => $surface['route_path'],
                'surface_type' => $surface['surface_type'],
                'sort_order' => $surface['sort_order'],
            ]);

            if ($record->isDirty()) {
                $record->save();
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function defaultsForKey(string $surfaceKey): array
    {
        foreach ($this->defaults() as $surface) {
            if ($surface['surface_key'] === $surfaceKey) {
                return $surface;
            }
        }

        abort(404);
    }
}
