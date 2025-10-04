<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\MediaFolder;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class TenantMediaManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected string $domain;

    protected function setUp(): void
    {
        parent::setUp();

        // Create tenant
        $this->tenant = Tenant::factory()->create([
            'name' => 'Test Tenant',
        ]);

        // Create domain for tenant
        $this->domain = 'test.example.com';
        $this->tenant->domains()->create([
            'domain' => $this->domain,
        ]);

        // Create user (users are central, not tenant-specific)
        $this->user = User::factory()->create([
            'email' => 'user@test.com',
        ]);

        // Create membership for user in this tenant
        $this->tenant->memberships()->create([
            'user_id' => $this->user->id,
            'role' => 'admin',
        ]);

        // Setup storage
        Storage::fake('public');
    }

    #[Test]
    public function tenant_can_create_folder()
    {
        // Initialize tenancy
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        // Access tenant API through tenant domain
        $response = $this->postJson("https://{$this->domain}/api/media-folders", [
            'name' => 'My Photos',
            'description' => 'Personal photo collection',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'folder' => ['id', 'name', 'slug', 'path'],
            ]);

        $this->assertDatabaseHas('media_folders', [
            'tenant_id' => $this->tenant->id,
            'name' => 'My Photos',
            'slug' => 'my-photos',
        ]);
    }

    #[Test]
    public function tenant_can_create_nested_folder()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        // Create parent folder
        $parent = MediaFolder::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Photos',
        ]);

        // Create child folder
        $response = $this->postJson("https://{$this->domain}/api/media-folders", [
            'name' => 'Vacation',
            'parent_id' => $parent->id,
        ]);

        $response->assertStatus(201);

        $child = MediaFolder::where('name', 'Vacation')->first();
        $this->assertEquals($parent->id, $child->parent_id);
        $this->assertEquals('/photos/vacation', $child->path);
    }

    #[Test]
    public function tenant_can_upload_image()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $file = UploadedFile::fake()->image('test.jpg', 800, 600)->size(1024); // 1MB

        $response = $this->postJson("https://{$this->domain}/api/media", [
            'image' => $file,
            'title' => 'Test Image',
            'alt_text' => 'A test image',
            'description' => 'This is a test image upload',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'media' => ['id', 'title', 'alt_text', 'description'],
            ]);

        $this->assertDatabaseHas('media_items', [
            'tenant_id' => $this->tenant->id,
            'title' => 'Test Image',
            'alt_text' => 'A test image',
        ]);
    }

    #[Test]
    public function tenant_can_upload_image_to_folder()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $folder = MediaFolder::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Folder',
        ]);

        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->postJson("https://{$this->domain}/api/media", [
            'image' => $file,
            'folder_id' => $folder->id,
            'title' => 'Folder Image',
        ]);

        $response->assertStatus(201);

        $media = Media::where('title', 'Folder Image')->first();
        $this->assertEquals($folder->id, $media->folder_id);
    }

    #[Test]
    public function image_upload_validates_file_type()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $file = UploadedFile::fake()->create('document.pdf', 1024);

        $response = $this->postJson("https://{$this->domain}/api/media", [
            'image' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    #[Test]
    public function image_upload_validates_file_size()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        // Create file larger than 10MB
        $file = UploadedFile::fake()->image('large.jpg')->size(11000); // 11MB

        $response = $this->postJson("https://{$this->domain}/api/media", [
            'image' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    #[Test]
    public function tenant_can_list_media()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        // Create some media
        Media::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson("https://{$this->domain}/api/media");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'title', 'tenant_id'],
                ],
            ]);
    }

    #[Test]
    public function tenant_can_filter_media_by_folder()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $folder = MediaFolder::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Folder',
        ]);

        Media::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'folder_id' => $folder->id,
        ]);

        Media::factory()->create([
            'tenant_id' => $this->tenant->id,
            'folder_id' => null,
        ]);

        $response = $this->getJson("https://{$this->domain}/api/media?folder_id={$folder->id}");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function tenant_can_update_media()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $media = Media::factory()->create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Original Title',
        ]);

        $response = $this->putJson("https://{$this->domain}/api/media/{$media->id}", [
            'title' => 'Updated Title',
            'alt_text' => 'Updated alt text',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('media_items', [
            'id' => $media->id,
            'title' => 'Updated Title',
            'alt_text' => 'Updated alt text',
        ]);
    }

    #[Test]
    public function tenant_can_delete_media()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $media = Media::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->deleteJson("https://{$this->domain}/api/media/{$media->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('media_items', [
            'id' => $media->id,
        ]);
    }

    #[Test]
    public function tenant_can_bulk_delete_media()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $media1 = Media::factory()->create(['tenant_id' => $this->tenant->id]);
        $media2 = Media::factory()->create(['tenant_id' => $this->tenant->id]);
        $media3 = Media::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->postJson("https://{$this->domain}/api/media/bulk-delete", [
            'ids' => [$media1->id, $media2->id],
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('media_items', ['id' => $media1->id]);
        $this->assertDatabaseMissing('media_items', ['id' => $media2->id]);
        $this->assertDatabaseHas('media_items', ['id' => $media3->id]); // Should still exist
    }

    #[Test]
    public function tenant_cannot_access_other_tenant_media()
    {
        // Create another tenant
        $otherTenant = Tenant::factory()->create([
            'name' => 'Other Tenant',
        ]);

        $otherTenant->domains()->create([
            'domain' => 'other.example.com',
        ]);

        $otherMedia = Media::factory()->create([
            'tenant_id' => $otherTenant->id,
        ]);

        // Initialize as first tenant
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        // Try to access other tenant's media
        $response = $this->getJson("https://{$this->domain}/api/media/{$otherMedia->id}");

        $response->assertStatus(404);
    }

    #[Test]
    public function folder_deletion_prevented_if_contains_media()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $folder = MediaFolder::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Folder',
        ]);

        Media::factory()->create([
            'tenant_id' => $this->tenant->id,
            'folder_id' => $folder->id,
        ]);

        $response = $this->deleteJson("https://{$this->domain}/api/media-folders/{$folder->id}");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Cannot delete folder with media or subfolders. Please delete or move contents first.']);

        $this->assertDatabaseHas('media_folders', ['id' => $folder->id]);
    }

    #[Test]
    public function can_get_folder_tree_structure()
    {
        tenancy()->initialize($this->tenant);
        Passport::actingAs($this->user);

        $parent = MediaFolder::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Parent',
        ]);

        $child = MediaFolder::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Child',
            'parent_id' => $parent->id,
        ]);

        $response = $this->getJson("https://{$this->domain}/api/media-folders/tree");

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => ['id', 'name', 'children'],
            ]);
    }
}
