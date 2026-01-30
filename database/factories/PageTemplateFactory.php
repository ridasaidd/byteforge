<?php

namespace Database\Factories;

use App\Models\PageTemplate;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Factories\Factory;

class PageTemplateFactory extends Factory
{
    protected $model = PageTemplate::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'theme_id' => Theme::factory(),
            'name' => $this->faker->words(3, true),
            'slug' => $this->faker->slug(),
            'description' => $this->faker->sentence(),
            'category' => $this->faker->randomElement(['landing', 'blog', 'about', 'contact']),
            'preview_image' => $this->faker->imageUrl(),
            'puck_data' => [
                'content' => [],
                'root' => [],
            ],
            'meta' => [],
            'is_active' => true,
            'usage_count' => 0,
        ];
    }

    /**
     * Indicate that the template is inactive
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Set the tenant ID for multi-tenancy
     */
    public function forTenant(string $tenantId): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenantId,
        ]);
    }
}
