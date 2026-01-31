<?php

namespace Tests\Feature\Api;

use App\Models\Theme;
use Tests\TestCase;

class ThemeDeletionTest extends TestCase
{
    public function test_cannot_delete_active_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => true,
        ]);

        $response = $this->actingAsSuperadmin()
            ->deleteJson("/api/superadmin/themes/{$theme->id}");

        $response->assertStatus(400)
            ->assertJson([
                'message' => 'Cannot delete active theme',
            ]);

        $this->assertDatabaseHas('themes', [
            'id' => $theme->id,
        ]);
    }

    public function test_can_delete_inactive_theme(): void
    {
        $theme = Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => false,
        ]);

        $response = $this->actingAsSuperadmin()
            ->deleteJson("/api/superadmin/themes/{$theme->id}");

        $response->assertOk()
            ->assertJson([
                'message' => 'Theme deleted successfully',
            ]);

        $this->assertDatabaseMissing('themes', [
            'id' => $theme->id,
        ]);
    }
}