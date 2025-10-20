<?php

namespace Database\Factories;

use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PageFactory extends Factory
{
    protected $model = Page::class;

    public function definition(): array
    {
        $title = $this->faker->sentence(3);

        return [
            'tenant_id' => (string) Str::uuid(), // Should be set explicitly in seeder for real tenancy
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::random(5),
            'page_type' => $this->faker->randomElement(['general', 'home', 'about', 'contact']),
            'meta_data' => null,
            'status' => $this->faker->randomElement(['draft', 'published', 'archived']),
            'is_homepage' => false,
            'sort_order' => $this->faker->numberBetween(0, 10),
            'created_by' => 1, // Should be set explicitly in seeder
            'published_at' => null,
        ];
    }
}
