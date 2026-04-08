<?php

namespace Database\Factories;

use App\Models\BookingAvailability;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingAvailabilityFactory extends Factory
{
    protected $model = BookingAvailability::class;

    public function definition(): array
    {
        return [
            'resource_id' => null,
            'day_of_week' => fake()->numberBetween(0, 6),
            'specific_date' => null,
            'starts_at' => '09:00:00',
            'ends_at' => '17:00:00',
            'is_blocked' => false,
        ];
    }

    public function recurring(): static
    {
        return $this->state(fn (array $attributes) => [
            'specific_date' => null,
            'day_of_week' => fake()->numberBetween(0, 6),
        ]);
    }

    public function specific(string $date): static
    {
        return $this->state(fn (array $attributes) => [
            'day_of_week' => null,
            'specific_date' => $date,
        ]);
    }

    public function blocked(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_blocked' => true,
        ]);
    }
}
