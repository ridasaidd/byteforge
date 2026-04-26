<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\BookingResource;
use App\Models\BookingService;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('now', '+1 month');
        $end = (clone $start)->modify('+1 hour');

        return [
            'tenant_id' => null,
            'service_id' => BookingService::factory(),
            'resource_id' => BookingResource::factory(),
            'guest_user_id' => null,
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => fake()->optional()->phoneNumber(),
            'starts_at' => $start,
            'ends_at' => $end,
            'status' => Booking::STATUS_PENDING,
            'hold_expires_at' => null,
            'parent_booking_id' => null,
            'management_token' => static fn () => Booking::generateToken(),
            'token_expires_at' => now()->addDays(3),
            'notification_opt_out' => false,
            'payment_id' => null,
            'internal_notes' => null,
            'customer_notes' => fake()->optional()->sentence(),
            'cancelled_at' => null,
            'cancelled_by' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Booking::STATUS_PENDING,
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Booking::STATUS_CONFIRMED,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Booking::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => fake()->randomElement([
                Booking::CANCELLED_BY_CUSTOMER,
                Booking::CANCELLED_BY_TENANT,
            ]),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Booking::STATUS_COMPLETED,
        ]);
    }

    public function slot(): static
    {
        $start = fake()->dateTimeBetween('now', '+1 month');
        $end = (clone $start)->modify('+1 hour');

        return $this->state(fn (array $attributes) => [
            'starts_at' => $start,
            'ends_at' => $end,
        ]);
    }

    public function range(): static
    {
        $start = fake()->dateTimeBetween('now', '+1 month');
        $end = fake()->dateTimeBetween($start, '+2 weeks');

        return $this->state(fn (array $attributes) => [
            'starts_at' => $start->format('Y-m-d') . ' 15:00:00',
            'ends_at' => $end->format('Y-m-d') . ' 11:00:00',
        ]);
    }

    public function forTenant(string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
        ]);
    }
}
