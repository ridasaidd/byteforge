<?php

namespace Database\Factories;

use App\Models\TenantPaymentProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

class TenantPaymentProviderFactory extends Factory
{
    protected $model = TenantPaymentProvider::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'provider' => fake()->randomElement(['stripe', 'swish', 'klarna']),
            'credentials' => [
                'publishable_key' => 'pk_test_' . fake()->bothify('####################'),
                'secret_key' => 'sk_test_' . fake()->bothify('####################'),
            ],
            'is_active' => true,
            'mode' => 'live',
            'webhook_secret' => fake()->sha256(),
        ];
    }

    public function stripe(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => 'stripe',
            'credentials' => [
                'publishable_key' => 'pk_test_' . fake()->bothify('####################'),
                'secret_key' => 'sk_test_' . fake()->bothify('####################'),
            ],
        ]);
    }

    public function swish(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => 'swish',
            'credentials' => [
                'client_id' => fake()->bothify('??????????'),
                'client_secret' => fake()->bothify('??????????????'),
            ],
        ]);
    }

    public function klarna(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => 'klarna',
            'credentials' => [
                'username' => 'K' . fake()->bothify('########'),
                'password' => fake()->bothify('####################'),
            ],
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
