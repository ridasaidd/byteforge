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
     * Create a user with the superadmin role.
     *
     * Use this state when you need a superadmin user in tests:
     *   User::factory()->superadmin()->create()
     *
     * For most tests, use the seeded users instead via TestUsers::centralSuperadmin()
     */
    public function superadmin(): static
    {
        return $this->afterCreating(function ($user) {
            $superadmin = Role::where('name', 'superadmin')
                ->where('guard_name', 'api')
                ->first();

            if ($superadmin) {
                $user->syncRoles([$superadmin]);
            }
        });
    }

    /**
     * Create a user with a specific role.
     */
    public function withRole(string $roleName): static
    {
        return $this->afterCreating(function ($user) use ($roleName) {
            $role = Role::where('name', $roleName)
                ->where('guard_name', 'api')
                ->first();

            if ($role) {
                $user->syncRoles([$role]);
            }
        });
    }
}

