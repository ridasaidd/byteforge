<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\PaymentProviderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class TenantPaymentProviderController extends Controller
{
    public function __construct(private readonly PaymentProviderService $paymentProviderService) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->paymentProviderService->listForTenant($tenant),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'provider' => ['required', 'string', 'in:stripe,swish,klarna'],
            'credentials' => ['required', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'mode' => ['sometimes', 'string', 'in:test,live'],
        ])->validate();

        $tenant = $this->resolveTenant($request);

        $provider = $this->paymentProviderService->store(
            $tenant,
            $validated['provider'],
            $validated['credentials'],
            (bool) ($validated['is_active'] ?? false),
            (string) ($validated['mode'] ?? 'test')
        );

        return response()->json([
            'data' => [
                'provider' => $provider->provider,
                'is_active' => (bool) $provider->is_active,
                'mode' => $provider->mode,
            ],
        ], 201);
    }

    public function update(Request $request, string $provider): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'credentials' => ['required', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'mode' => ['sometimes', 'string', 'in:test,live'],
        ])->validate();

        $tenant = $this->resolveTenant($request);

        $updated = $this->paymentProviderService->update(
            $tenant,
            $provider,
            $validated['credentials'],
            (bool) ($validated['is_active'] ?? false),
            (string) ($validated['mode'] ?? 'test')
        );

        return response()->json([
            'data' => [
                'provider' => $updated->provider,
                'is_active' => (bool) $updated->is_active,
                'mode' => $updated->mode,
            ],
        ]);
    }

    public function destroy(Request $request, string $provider): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        $this->paymentProviderService->delete($tenant, $provider);

        return response()->json(['message' => 'Provider removed.']);
    }

    public function testConnection(Request $request, string $provider): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'credentials' => ['required', 'array'],
        ])->validate();

        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->paymentProviderService->testConnection($tenant, $provider, $validated['credentials']),
        ]);
    }

    private function resolveTenant(Request $request): Tenant
    {
        $currentTenantId = (string) (tenant('id') ?? '');
        if ($currentTenantId === '') {
            abort(403, 'Tenant context is required.');
        }

        $requestedTenantId = $request->input('tenant_id');
        if (is_string($requestedTenantId) && $requestedTenantId !== '' && $requestedTenantId !== $currentTenantId) {
            abort(403, 'Cross-tenant access is not allowed.');
        }

        $user = Auth::user();
        if ($user && isset($user->tenant_id) && $user->tenant_id !== null && (string) $user->tenant_id !== $currentTenantId) {
            abort(403, 'User does not belong to this tenant.');
        }

        return Tenant::query()->findOrFail($currentTenantId);
    }
}
