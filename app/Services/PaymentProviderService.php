<?php

namespace App\Services;

use App\Actions\Api\ValidateProviderCredentialsAction;
use App\Models\Tenant;
use App\Models\TenantPaymentProvider;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentProviderService
{
    public function __construct(
        private readonly ValidateProviderCredentialsAction $validateProviderCredentialsAction,
        private readonly BillingService $billingService,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function listForTenant(Tenant $tenant): Collection
    {
        $this->assertTenantHasPaymentsAddon($tenant);

        return TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->orderBy('provider')
            ->get()
            ->map(function (TenantPaymentProvider $provider): array {
                return [
                    'provider' => $provider->provider,
                    'is_active' => (bool) $provider->is_active,
                    'mode' => $provider->mode,
                    'credentials_summary' => $this->maskCredentials($provider->provider, (array) $provider->credentials),
                    'created_at' => $provider->created_at?->toISOString(),
                    'updated_at' => $provider->updated_at?->toISOString(),
                ];
            })
            ->values();
    }

    /**
     * @param array<string, mixed> $credentials
     */
    public function store(Tenant $tenant, string $provider, array $credentials, bool $isActive, string $mode): TenantPaymentProvider
    {
        $this->assertTenantHasPaymentsAddon($tenant);

        $normalizedProvider = strtolower($provider);

        $validation = $this->validateProviderCredentialsAction->handle($normalizedProvider, $credentials);
        if (!$validation['valid']) {
            throw ValidationException::withMessages($validation['errors']);
        }

        return DB::transaction(function () use ($tenant, $normalizedProvider, $credentials, $isActive, $mode) {
            $exists = TenantPaymentProvider::query()
                ->forTenant((string) $tenant->id)
                ->where('provider', $normalizedProvider)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'provider' => 'Provider already exists for this tenant.',
                ]);
            }

            return TenantPaymentProvider::query()->create([
                'tenant_id' => (string) $tenant->id,
                'provider' => $normalizedProvider,
                'credentials' => $credentials,
                'is_active' => $isActive,
                'mode' => $mode,
                'webhook_secret' => $credentials['webhook_secret'] ?? null,
            ]);
        });
    }

    /**
     * @param array<string, mixed> $credentials
     */
    public function update(Tenant $tenant, string $provider, array $credentials, bool $isActive, string $mode): TenantPaymentProvider
    {
        $this->assertTenantHasPaymentsAddon($tenant);

        $normalizedProvider = strtolower($provider);

        $validation = $this->validateProviderCredentialsAction->handle($normalizedProvider, $credentials);
        if (!$validation['valid']) {
            throw ValidationException::withMessages($validation['errors']);
        }

        $model = TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', $normalizedProvider)
            ->firstOrFail();

        $model->update([
            'credentials' => $credentials,
            'is_active' => $isActive,
            'mode' => $mode,
            'webhook_secret' => $credentials['webhook_secret'] ?? null,
        ]);

        return $model->fresh();
    }

    public function delete(Tenant $tenant, string $provider): void
    {
        $this->assertTenantHasPaymentsAddon($tenant);

        $normalizedProvider = strtolower($provider);

        TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', $normalizedProvider)
            ->delete();
    }

    /**
     * @param array<string, mixed> $credentials
     * @return array{valid: bool, message: string, errors: array<string, string>}
     */
    public function testConnection(Tenant $tenant, string $provider, array $credentials): array
    {
        $this->assertTenantHasPaymentsAddon($tenant);

        $validation = $this->validateProviderCredentialsAction->handle(strtolower($provider), $credentials);

        if (!$validation['valid']) {
            return [
                'valid' => false,
                'message' => 'Credential validation failed.',
                'errors' => $validation['errors'],
            ];
        }

        return [
            'valid' => true,
            'message' => 'Credential format looks valid.',
            'errors' => [],
        ];
    }

    private function assertTenantHasPaymentsAddon(Tenant $tenant): void
    {
        if (!$this->billingService->hasAddon($tenant, 'payments')) {
            throw ValidationException::withMessages([
                'addon' => 'Payment Processing add-on is required before configuring providers.',
            ]);
        }
    }

    /**
     * @param array<string, mixed> $credentials
     * @return array<string, string>
     */
    private function maskCredentials(string $provider, array $credentials): array
    {
        $masked = [];

        foreach ($credentials as $key => $value) {
            if (!is_scalar($value)) {
                continue;
            }

            $raw = (string) $value;
            if (in_array($key, ['certificate', 'private_key', 'ca_certificate'], true)) {
                $masked[$key] = trim($raw) === '' ? '' : '[uploaded]';
                continue;
            }

            if ($raw === '') {
                $masked[$key] = '';
                continue;
            }

            $masked[$key] = $this->maskValue($raw);
        }

        if ($provider === 'swish' && !array_key_exists('merchant_swish_number', $masked)) {
            $masked['merchant_swish_number'] = '';
        }

        return $masked;
    }

    private function maskValue(string $value): string
    {
        if (strlen($value) <= 11) {
            return str_repeat('*', strlen($value));
        }

        return substr($value, 0, 8) . '...' . substr($value, -3);
    }
}
