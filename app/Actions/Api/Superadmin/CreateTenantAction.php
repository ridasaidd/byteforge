<?php

namespace App\Actions\Api\Superadmin;

use App\Models\Tenant;
use App\Services\ThemeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Lorisleiva\Actions\Concerns\AsAction;
use Stancl\Tenancy\Database\Models\Domain;

class CreateTenantAction
{
    use AsAction;

    public function __construct(
        private readonly ThemeService $themeService,
    ) {}

    public function handle(array $data): array
    {
        return $this->execute($data);
    }

    public function execute(array $data): array
    {
        $validated = Validator::make($data, [
            'name' => 'required|string|max:255',
            'domain' => 'required|string|max:255|unique:domains,domain',
        ])->validate();

        return DB::transaction(function () use ($validated): array {
            // Create tenant — assign id directly (not via mass assignment)
            $tenant = new Tenant([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']),
            ]);
            $tenant->id = (string) Str::uuid();
            $tenant->save();

            // Create domain for the tenant
            $domain = Domain::create([
                'domain' => $validated['domain'],
                'tenant_id' => $tenant->id,
            ]);

            // Provision a default active theme when the platform has system themes available.
            $this->themeService->getOrCreateDefaultTheme($tenant->id);

            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'domain' => $domain->domain,
                'created_at' => $tenant->created_at->toISOString(),
                'updated_at' => $tenant->updated_at->toISOString(),
            ];
        });
    }
}
