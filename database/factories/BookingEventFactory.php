<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\BookingEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingEventFactory extends Factory
{
    protected $model = BookingEvent::class;

    public function definition(): array
    {
        $statuses = [
            Booking::STATUS_PENDING,
            Booking::STATUS_PENDING_HOLD,
            Booking::STATUS_AWAITING_PAYMENT,
            Booking::STATUS_CONFIRMED,
            Booking::STATUS_COMPLETED,
            Booking::STATUS_CANCELLED,
            Booking::STATUS_NO_SHOW,
        ];

        return [
            'booking_id' => Booking::factory(),
            'from_status' => fake()->optional()->randomElement($statuses),
            'to_status' => fake()->randomElement($statuses),
            'actor_type' => fake()->randomElement([
                BookingEvent::ACTOR_SYSTEM,
                BookingEvent::ACTOR_TENANT_USER,
                BookingEvent::ACTOR_CUSTOMER,
            ]),
            'actor_id' => null,
            'note' => fake()->optional()->sentence(),
        ];
    }

    public function bySystem(): static
    {
        return $this->state(fn (array $attributes) => [
            'actor_type' => BookingEvent::ACTOR_SYSTEM,
            'actor_id' => null,
        ]);
    }

    public function byTenantUser(int $userId): static
    {
        return $this->state(fn (array $attributes) => [
            'actor_type' => BookingEvent::ACTOR_TENANT_USER,
            'actor_id' => $userId,
        ]);
    }
}
