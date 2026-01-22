<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'type' => fake()->randomElement(['tenant_user', 'customer', 'superadmin']),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Configure the factory for testing - auto-assign superadmin role.
     */
    public function configure(): static
    {
        return $this->afterCreating(function ($user) {
            // In test environment, auto-assign superadmin role for convenience
            if (app()->environment('testing')) {
                $superadmin = Role::where('name', 'superadmin')
                    ->where('guard_name', 'api')
                    ->first();

                if ($superadmin) {
                    $user->syncRoles([$superadmin]);
                }
            }
        });
    }
}

