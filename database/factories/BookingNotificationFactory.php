<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\BookingNotification;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingNotificationFactory extends Factory
{
    protected $model = BookingNotification::class;

    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'type' => fake()->randomElement([
                'booking_confirmed',
                'booking_cancelled',
                'reminder_24h',
                'reminder_1h',
            ]),
            'channel' => fake()->randomElement([
                BookingNotification::CHANNEL_EMAIL,
                BookingNotification::CHANNEL_PUSH,
                BookingNotification::CHANNEL_SMS,
            ]),
            'recipient' => fake()->randomElement([
                BookingNotification::RECIPIENT_CUSTOMER,
                BookingNotification::RECIPIENT_STAFF,
                BookingNotification::RECIPIENT_ADMIN,
            ]),
            'sent_at' => now(),
        ];
    }

    public function email(): static
    {
        return $this->state(fn (array $attributes) => [
            'channel' => BookingNotification::CHANNEL_EMAIL,
        ]);
    }

    public function toCustomer(): static
    {
        return $this->state(fn (array $attributes) => [
            'recipient' => BookingNotification::RECIPIENT_CUSTOMER,
        ]);
    }
}
