<?php

namespace Database\Factories;

use App\Models\BookingService;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingServiceFactory extends Factory
{
    protected $model = BookingService::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'booking_mode' => fake()->randomElement([BookingService::MODE_SLOT, BookingService::MODE_RANGE]),
            'duration_minutes' => 60,
            'slot_interval_minutes' => 30,
            'min_nights' => null,
            'max_nights' => null,
            'buffer_minutes' => 0,
            'advance_notice_hours' => 0,
            'max_advance_days' => null,
            'price' => fake()->optional()->randomFloat(2, 100, 5000),
            'currency' => 'SEK',
            'is_active' => true,
        ];
    }

    public function slot(): static
    {
        return $this->state(fn (array $attributes) => [
            'booking_mode' => BookingService::MODE_SLOT,
            'duration_minutes' => 60,
            'slot_interval_minutes' => 30,
            'min_nights' => null,
            'max_nights' => null,
        ]);
    }

    public function range(): static
    {
        return $this->state(fn (array $attributes) => [
            'booking_mode' => BookingService::MODE_RANGE,
            'duration_minutes' => null,
            'slot_interval_minutes' => null,
            'min_nights' => 1,
            'max_nights' => 14,
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
