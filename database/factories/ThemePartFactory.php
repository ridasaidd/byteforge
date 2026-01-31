<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ThemePart>
 */
class ThemePartFactory extends Factory
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
            'slug' => Str::slug($name).'-'.Str::random(5),
            'type' => $this->faker->randomElement(['header', 'footer', 'sidebar_left', 'sidebar_right', 'section']),
            'puck_data_raw' => [
                'content' => [
                    [
                        'type' => 'Text',
                        'props' => [
                            'text' => $this->faker->sentence(),
                        ],
                    ],
                ],
            ],
            'puck_data_compiled' => null,
            'status' => $this->faker->randomElement(['draft', 'published']),
            'sort_order' => $this->faker->numberBetween(0, 10),
            'created_by' => fn () => User::where('email', 'superadmin@byteforge.se')->first()?->id ?? User::factory()->create()->id,
        ];
    }
}
