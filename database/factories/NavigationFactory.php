<?php

namespace Database\Factories;

use App\Models\Navigation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class NavigationFactory extends Factory
{
    protected $model = Navigation::class;

    public function definition(): array
    {
        $name = $this->faker->word().' Menu';

        return [
            'tenant_id' => (string) Str::uuid(), // Should be set explicitly in seeder for real tenancy
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(5),
            'structure' => null, // Empty for now
            'status' => $this->faker->randomElement(['active', 'draft', 'archived']),
            'sort_order' => $this->faker->numberBetween(0, 10),
            'created_by' => 1, // Should be set explicitly in seeder
        ];
    }
}
