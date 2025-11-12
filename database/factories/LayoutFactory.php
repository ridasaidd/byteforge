<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Layout>
 */
class LayoutFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->words(2, true);

        return [
            'tenant_id' => null,
            'name' => $name,
            'slug' => Str::slug($name) . '-' . Str::random(5),
            'header_id' => null,
            'footer_id' => null,
            'sidebar_left_id' => null,
            'sidebar_right_id' => null,
            'status' => $this->faker->randomElement(['draft', 'published']),
        ];
    }
}
