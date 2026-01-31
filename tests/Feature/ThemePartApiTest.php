<?php

namespace Tests\Feature;

use App\Models\Layout;
use App\Models\Page;
use App\Models\Theme;
use App\Models\ThemePart;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ThemePartApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // Tests use actingAsSuperadmin() helper to authenticate
    }

    #[Test]
    public function it_can_list_theme_parts()
    {
        ThemePart::factory()->count(3)->create(['tenant_id' => null]);

        $response = $this->actingAsSuperadmin()
            ->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/theme-parts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'type',
                        'status',
                        'created_at',
                        'updated_at',
                    ],
                ],
                'meta',
            ]);

        $this->assertCount(3, $response->json('data'));
    }

    #[Test]
    public function it_can_create_theme_part()
    {
        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->postJson('/api/superadmin/theme-parts', [
                'name' => 'Main Header',
                'type' => 'header',
                'status' => 'draft',
                'puck_data_raw' => [
                    'content' => [
                        ['type' => 'Header', 'props' => ['title' => 'My Site']],
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Main Header')
            ->assertJsonPath('data.type', 'header')
            ->assertJsonPath('data.slug', 'main-header');

        $this->assertDatabaseHas('theme_parts', [
            'name' => 'Main Header',
            'type' => 'header',
        ]);
    }

    #[Test]
    public function it_compiles_theme_part_on_publish()
    {
        Theme::factory()->create([
            'tenant_id' => null,
            'is_active' => true,
            'theme_data' => [
                'colors' => [
                    'primary' => ['500' => '#3B82F6'],
                ],
            ],
        ]);

        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->postJson('/api/superadmin/theme-parts', [
                'name' => 'Themed Header',
                'type' => 'header',
                'status' => 'published',
                'puck_data_raw' => [
                    'content' => [
                        [
                            'type' => 'Header',
                            'props' => ['backgroundColor' => 'colors.primary.500'],
                        ],
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $themePart = ThemePart::find($response->json('data.id'));
        $this->assertNotNull($themePart->puck_data_compiled);
        $this->assertEquals(
            '#3B82F6',
            $themePart->puck_data_compiled['content'][0]['props']['backgroundColor']
        );
    }

    #[Test]
    public function it_can_update_theme_part()
    {
        $themePart = ThemePart::factory()->create([
            'tenant_id' => null,
            'name' => 'Old Name',
            'type' => 'header',
        ]);

        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->putJson("/api/superadmin/theme-parts/{$themePart->id}", [
                'name' => 'New Name',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('theme_parts', [
            'id' => $themePart->id,
            'name' => 'New Name',
        ]);
    }

    #[Test]
    public function it_can_delete_theme_part()
    {
        $themePart = ThemePart::factory()->create(['tenant_id' => null]);

        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->deleteJson("/api/superadmin/theme-parts/{$themePart->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('theme_parts', [
            'id' => $themePart->id,
        ]);
    }

    #[Test]
    public function it_validates_theme_part_type()
    {
        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->postJson('/api/superadmin/theme-parts', [
                'name' => 'Invalid Part',
                'type' => 'invalid_type',
                'status' => 'draft',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    #[Test]
    public function it_can_filter_theme_parts_by_type()
    {
        ThemePart::factory()->create(['tenant_id' => null, 'type' => 'header']);
        ThemePart::factory()->create(['tenant_id' => null, 'type' => 'footer']);
        ThemePart::factory()->create(['tenant_id' => null, 'type' => 'header']);

        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->getJson('/api/superadmin/theme-parts?type=header');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_auto_generates_unique_slugs()
    {
        ThemePart::factory()->create([
            'tenant_id' => null,
            'name' => 'Header',
            'slug' => 'header',
        ]);

        $response = $this->actingAsSuperadmin()->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->postJson('/api/superadmin/theme-parts', [
                'name' => 'Header',
                'type' => 'header',
                'status' => 'draft',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.slug', 'header-1');
    }
}
