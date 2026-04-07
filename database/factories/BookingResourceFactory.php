<?php

namespace Database\Factories;

use App\Models\BookingResource;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingResourceFactory extends Factory
{
    protected $model = BookingResource::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'name' => fake()->name(),
            'type' => fake()->randomElement([
                BookingResource::TYPE_PERSON,
                BookingResource::TYPE_SPACE,
                BookingResource::TYPE_EQUIPMENT,
            ]),
            'capacity' => 1,
            'resource_label' => null,
            'user_id' => null,
            'is_active' => true,
        ];
    }

    public function person(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => BookingResource::TYPE_PERSON,
        ]);
    }

    public function space(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => BookingResource::TYPE_SPACE,
        ]);
    }

    public function equipment(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => BookingResource::TYPE_EQUIPMENT,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function forTenant(string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
        ]);
    }
}
