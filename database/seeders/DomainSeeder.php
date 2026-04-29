<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Stancl\Tenancy\Database\Models\Domain;

class DomainSeeder extends Seeder
{
    public function run(): void
    {
        // Create domains for non-fixed tenants (fixed tenants already have domains)
        foreach (Tenant::whereNotIn('id', ['tenant_one', 'tenant_two', 'tenant_three'])->get() as $tenant) {
            Domain::create([
                'domain' => $this->tenantDomain((string) $tenant->slug),
                'tenant_id' => $tenant->id,
            ]);
        }
    }

    private function tenantDomain(string $tenantSlug): string
    {
        $template = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.byteforge.se');
        $resolved = str_replace(':tenant', $tenantSlug, $template);
        $normalized = strtolower($resolved);

        if ($normalized === '' || str_contains($normalized, 'localhost') || str_contains($normalized, '127.0.0.1')) {
            return sprintf('%s.%s', $tenantSlug, $this->centralDomain());
        }

        return $resolved;
    }

    private function centralDomain(): string
    {
        $domains = config('tenancy.central_domains', []);

        if (is_string($domains)) {
            $domains = explode(',', $domains);
        }

        foreach ((array) $domains as $domain) {
            $candidate = trim((string) $domain);
            if ($candidate === '' || in_array($candidate, ['localhost', '127.0.0.1'], true)) {
                continue;
            }

            return $candidate;
        }

        return 'byteforge.se';
    }
}
