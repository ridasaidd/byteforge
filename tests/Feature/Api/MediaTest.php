<?php

namespace Tests\Feature\Api;

use App\Models\Media;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MediaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);

        // Fake storage for testing
        Storage::fake('public');
    }

    #[Test]
    public function authenticated_user_can_upload_media()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-media-upload.test';
        $tenant->domains()->create(['domain' => $domain]);

        $file = UploadedFile::fake()->image('test-image.jpg', 800, 600)->size(1024);

        $response = $this->postJson("https://{$domain}/api/media", [
            'file' => $file,
            'collection' => 'featured-image',
            'custom_properties' => [
                'alt_text' => 'Test Image',
                'caption' => 'A beautiful test image',
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Media uploaded successfully',
                'data' => [
                    'collection_name' => 'featured-image',
                    'mime_type' => 'image/jpeg',
                ],
            ]);

        // Verify media was created in database with tenant_id
        $this->assertDatabaseHas('media', [
            'tenant_id' => $tenant->id,
            'collection_name' => 'featured-image',
            'mime_type' => 'image/jpeg',
        ]);
    }

    #[Test]
    public function authenticated_user_can_list_media()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-media-list.test';
        $tenant->domains()->create(['domain' => $domain]);

        // Create a page and attach media to it
        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page with Media',
            'slug' => 'test-page-media',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $file = UploadedFile::fake()->image('list-test.jpg');
        $page->addMedia($file)->toMediaCollection('featured-image');

        $response = $this->getJson("https://{$domain}/api/media");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'file_name',
                        'mime_type',
                        'size',
                        'collection_name',
                    ],
                ],
                'links',
                'meta',
            ]);
    }

    #[Test]
    public function authenticated_user_can_filter_media_by_collection()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-media-filter.test';
        $tenant->domains()->create(['domain' => $domain]);

        // Create MediaLibrary entries and attach media to different collections
        $mediaLib1 = \App\Models\MediaLibrary::create([
            'tenant_id' => $tenant->id,
            'name' => 'Featured Image',
            'uploaded_by' => $user->id,
        ]);
        $mediaLib1->addMedia(UploadedFile::fake()->image('featured.jpg'))->toMediaCollection('featured-image');

        $mediaLib2 = \App\Models\MediaLibrary::create([
            'tenant_id' => $tenant->id,
            'name' => 'Gallery Image 1',
            'uploaded_by' => $user->id,
        ]);
        $mediaLib2->addMedia(UploadedFile::fake()->image('gallery1.jpg'))->toMediaCollection('gallery');

        $mediaLib3 = \App\Models\MediaLibrary::create([
            'tenant_id' => $tenant->id,
            'name' => 'Gallery Image 2',
            'uploaded_by' => $user->id,
        ]);
        $mediaLib3->addMedia(UploadedFile::fake()->image('gallery2.jpg'))->toMediaCollection('gallery');

        $response = $this->getJson("https://{$domain}/api/media?collection=gallery");

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals('gallery', $data[0]['collection_name']);
    }

    #[Test]
    public function authenticated_user_can_view_single_media()
    {
        Storage::fake('public');

        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-media-view.test';
        $tenant->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page',
            'slug' => 'test-page-view',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $media = $page->addMedia(UploadedFile::fake()->image('view-test.jpg'))
            ->withCustomProperties(['alt_text' => 'View test'])
            ->toMediaCollection('featured-image');

        $response = $this->getJson("https://{$domain}/api/media/{$media->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $media->id,
                    'name' => 'view-test',
                    'collection_name' => 'featured-image',
                    'custom_properties' => [
                        'alt_text' => 'View test',
                    ],
                ],
            ]);
    }

    #[Test]
    public function authenticated_user_can_delete_media()
    {
        Storage::fake('public');

        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-media-delete.test';
        $tenant->domains()->create(['domain' => $domain]);

        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page',
            'slug' => 'test-page-delete',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $media = $page->addMedia(UploadedFile::fake()->image('delete-test.jpg'))
            ->toMediaCollection('featured-image');

        $response = $this->deleteJson("https://{$domain}/api/media/{$media->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Media deleted successfully',
            ]);

        $this->assertDatabaseMissing('media', [
            'id' => $media->id,
        ]);
    }

    #[Test]
    public function user_cannot_view_media_from_different_tenant()
    {
        Storage::fake('public');

        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        // Create media in tenant1
        tenancy()->initialize($tenant1);
        $page1 = Page::create([
            'tenant_id' => $tenant1->id,
            'title' => 'Tenant 1 Page',
            'slug' => 'tenant-1-page',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);
        $media = $page1->addMedia(UploadedFile::fake()->image('tenant1.jpg'))
            ->toMediaCollection('featured-image');

        // Try to access from tenant2
        tenancy()->initialize($tenant2);
        $domain2 = 'tenant2-media-isolation.test';
        $tenant2->domains()->create(['domain' => $domain2]);

        $response = $this->getJson("https://{$domain2}/api/media/{$media->id}");

        $response->assertStatus(404);
    }

    #[Test]
    public function media_upload_validates_file()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        Passport::actingAs($user);

        tenancy()->initialize($tenant);
        $domain = 'tenant-media-validation.test';
        $tenant->domains()->create(['domain' => $domain]);

        // Test without file
        $response = $this->postJson("https://{$domain}/api/media", [
            'collection' => 'featured-image',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function page_can_have_media_collections()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create();
        tenancy()->initialize($tenant);

        $page = Page::create([
            'tenant_id' => $tenant->id,
            'title' => 'Page with Collections',
            'slug' => 'page-collections',
            'page_type' => 'general',
            'status' => 'published',
            'is_homepage' => false,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        // Test featured-image collection (single file)
        $page->addMedia(UploadedFile::fake()->image('featured.jpg'))
            ->toMediaCollection('featured-image');

        $this->assertCount(1, $page->getMedia('featured-image'));

        // Test gallery collection (multiple files)
        $page->addMedia(UploadedFile::fake()->image('gallery1.jpg'))
            ->toMediaCollection('gallery');
        $page->addMedia(UploadedFile::fake()->image('gallery2.jpg'))
            ->toMediaCollection('gallery');

        $page->refresh();
        $this->assertCount(2, $page->getMedia('gallery'));

        // Test attachments collection
        $page->addMedia(UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'))
            ->toMediaCollection('attachments');

        $page->refresh();
        $this->assertCount(1, $page->getMedia('attachments'));

        // Clean up - delete test media files
        $page->clearMediaCollection();
    }
}
