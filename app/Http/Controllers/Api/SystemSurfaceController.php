<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSurface;
use App\Services\SystemSurfaceProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemSurfaceController extends Controller
{
    public function __construct(
        private readonly SystemSurfaceProvisioningService $provisioning,
    ) {}

    public function index(): JsonResponse
    {
        $tenantId = $this->currentTenantId();
        $this->provisioning->ensureTenantDefaults($tenantId);

        $surfaces = SystemSurface::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $surfaces->map(fn (SystemSurface $surface) => $this->transform($surface))->all(),
        ]);
    }

    public function show(string $surfaceKey): JsonResponse
    {
        return response()->json([
            'data' => $this->transform($this->findSurface($surfaceKey)),
        ]);
    }

    public function publicShow(string $surfaceKey): JsonResponse
    {
        $surface = $this->findSurface($surfaceKey);

        abort_unless($surface->is_enabled, 404);

        return response()->json([
            'data' => $this->transform($surface),
        ]);
    }

    public function update(Request $request, string $surfaceKey): JsonResponse
    {
        $surface = $this->findSurface($surfaceKey);

        $validated = $request->validate([
            'puck_data' => ['nullable', 'array'],
            'settings' => ['nullable', 'array'],
            'is_enabled' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);

        $surface->fill($validated);
        $surface->save();

        return response()->json([
            'data' => $this->transform($surface->fresh()),
        ]);
    }

    public function reset(string $surfaceKey): JsonResponse
    {
        $surface = $this->findSurface($surfaceKey);
        $defaults = $this->provisioning->defaultsForKey($surfaceKey);

        $surface->fill([
            'title' => $defaults['title'],
            'route_path' => $defaults['route_path'],
            'surface_type' => $defaults['surface_type'],
            'puck_data' => $defaults['puck_data'],
            'settings' => $defaults['settings'],
            'is_enabled' => $defaults['is_enabled'],
            'sort_order' => $defaults['sort_order'],
            'published_at' => $defaults['published_at'],
        ]);
        $surface->save();

        return response()->json([
            'data' => $this->transform($surface->fresh()),
        ]);
    }

    private function findSurface(string $surfaceKey): SystemSurface
    {
        $tenantId = $this->currentTenantId();
        $this->provisioning->ensureTenantDefaults($tenantId);

        return SystemSurface::query()
            ->where('tenant_id', $tenantId)
            ->where('surface_key', $surfaceKey)
            ->whereIn('surface_key', SystemSurface::defaultKeys())
            ->firstOrFail();
    }

    private function currentTenantId(): string
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        return (string) tenancy()->tenant->id;
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(SystemSurface $surface): array
    {
        return [
            'id' => $surface->id,
            'tenant_id' => $surface->tenant_id,
            'surface_key' => $surface->surface_key,
            'title' => $surface->title,
            'route_path' => $surface->route_path,
            'surface_type' => $surface->surface_type,
            'puck_data' => $surface->puck_data,
            'settings' => $surface->settings,
            'is_enabled' => $surface->is_enabled,
            'sort_order' => $surface->sort_order,
            'published_at' => $surface->published_at?->toISOString(),
            'created_at' => $surface->created_at?->toISOString(),
            'updated_at' => $surface->updated_at?->toISOString(),
        ];
    }
}
