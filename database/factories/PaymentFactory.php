<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'provider' => $this->faker->randomElement(['stripe', 'swish', 'klarna']),
            'provider_transaction_id' => $this->faker->uuid(),
            'status' => Payment::STATUS_PENDING,
            'amount' => $this->faker->numberBetween(1000, 100000), // Amount in cents
            'currency' => 'SEK',
            'customer_email' => $this->faker->email(),
            'customer_name' => $this->faker->name(),
            'metadata' => [
                'reference' => "booking:{$this->faker->numberBetween(1, 10000)}",
            ],
            'provider_response' => [],
        ];
    }

    /**
     * Indicate payment is completed.
     */
    public function completed(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => Payment::STATUS_COMPLETED,
                'paid_at' => now(),
            ];
        });
    }

    /**
     * Indicate payment failed.
     */
    public function failed(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => Payment::STATUS_FAILED,
                'failed_at' => now(),
            ];
        });
    }

    /**
     * Indicate payment is refunded.
     */
    public function refunded(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => Payment::STATUS_REFUNDED,
                'refunded_at' => now(),
            ];
        });
    }

    /**
     * Specify Stripe as provider.
     */
    public function stripe(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'provider' => 'stripe',
            ];
        });
    }

    /**
     * Specify Swish as provider.
     */
    public function swish(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'provider' => 'swish',
            ];
        });
    }

    /**
     * Specify Klarna as provider.
     */
    public function klarna(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'provider' => 'klarna',
            ];
        });
    }
}
