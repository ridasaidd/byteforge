<?php

namespace Database\Factories;

use App\Models\BookingResourceBlock;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingResourceBlockFactory extends Factory
{
    protected $model = BookingResourceBlock::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('now', '+1 month');
        $end = fake()->dateTimeBetween($start, '+2 months');

        return [
            'resource_id' => null,
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'reason' => fake()->optional()->sentence(5),
            'created_by' => null,
        ];
    }
}
