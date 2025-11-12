<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Theme>
 */
class ThemeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->words(3, true);

        return [
            'tenant_id' => null,
            'name' => $name,
            'slug' => Str::slug($name) . '-' . Str::random(5),
            'theme_data' => [
                'colors' => [
                    'primary' => [
                        '500' => '#3B82F6',
                        '600' => '#2563EB',
                    ],
                    'secondary' => [
                        '500' => '#8B5CF6',
                    ],
                ],
                'typography' => [
                    'fontSize' => [
                        'sm' => '0.875rem',
                        'base' => '1rem',
                        'lg' => '1.125rem',
                        'xl' => '1.25rem',
                    ],
                ],
                'spacing' => [
                    'sm' => '0.5rem',
                    'md' => '1rem',
                    'lg' => '1.5rem',
                ],
            ],
            'is_active' => false,
        ];
    }
}
