<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = fake()->company();
        return [
            'id' => (string) Str::uuid(),
            'name' => $name,
            'slug' => Str::slug($name),
            // VirtualColumn pattern: set non-custom attributes directly
            'email' => fake()->companyEmail(),
            'phone' => fake()->phoneNumber(),
            'status' => 'active',
        ];
    }

    /**
     * Configure the factory after creation
     */
    public function configure()
    {
        return $this->afterCreating(function (Tenant $tenant) {
            // Create a domain for the tenant
            $tenant->domains()->create([
                'domain' => Str::slug($tenant->name) . '.example.com',
            ]);
        });
    }
}
