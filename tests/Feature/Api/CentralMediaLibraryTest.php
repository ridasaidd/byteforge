<?php

namespace Tests\Feature\Api;

use App\Models\Media;
use App\Models\MediaFolder;
use App\Models\MediaLibrary;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CentralMediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);

        Storage::fake('public');
        
        $this->user = User::factory()->create();
        Passport::actingAs($this->user);
    }

    #[Test]
    public function user_can_upload_media_to_central_library()
    {
        $file = UploadedFile::fake()->image('test-image.jpg', 800, 600)->size(1024);

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'name',
                    'file_name',
                    'mime_type',
                    'size',
                    'url',
                    'thumbnail_url',
                ],
            ]);

        // Verify media was created with null tenant_id (central context)
        $this->assertDatabaseHas('media', [
            'tenant_id' => null,
            'file_name' => 'test-image.jpg',
            'mime_type' => 'image/jpeg',
        ]);

        // Verify MediaLibrary record was created
        $this->assertDatabaseHas('media_libraries', [
            'tenant_id' => null,
            'folder_id' => null,
        ]);
    }

    #[Test]
    public function user_can_upload_media_to_specific_folder()
    {
        $folder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Test Folder',
            'parent_id' => null,
        ]);

        $file = UploadedFile::fake()->image('folder-test.jpg');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
            'folder_id' => $folder->id,
        ]);

        $response->assertStatus(201);

        // Verify MediaLibrary has correct folder_id
        $this->assertDatabaseHas('media_libraries', [
            'tenant_id' => null,
            'folder_id' => $folder->id,
        ]);
    }

    #[Test]
    public function user_can_list_media_in_root_folder()
    {
        // Create media in root (folder_id = null)
        $mediaLibrary = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => null,
            'name' => 'Root Media Library',
            'uploaded_by' => $this->user->id,
        ]);

        $mediaLibrary->addMedia(UploadedFile::fake()->image('root-image.jpg'))
            ->toMediaCollection('default');

        $response = $this->getJson('/api/superadmin/media');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'file_name',
                        'mime_type',
                        'size',
                        'url',
                        'thumbnail_url',
                        'human_readable_size',
                    ],
                ],
                'links',
                'meta',
            ]);

        $this->assertGreaterThan(0, count($response->json('data')));
    }

    #[Test]
    public function user_can_filter_media_by_folder()
    {
        $folder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'My Folder',
            'parent_id' => null,
        ]);

        // Create media in folder
        $mediaLibrary = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => $folder->id,
            'name' => 'In Folder Media',
        ]);
        $mediaLibrary->addMedia(UploadedFile::fake()->image('in-folder.jpg'))
            ->toMediaCollection('default');

        // Create media in root
        $rootLibrary = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => null,
            'name' => 'Root Media',
        ]);
        $rootLibrary->addMedia(UploadedFile::fake()->image('in-root.jpg'))
            ->toMediaCollection('default');

        // Request media in specific folder
        $response = $this->getJson("/api/superadmin/media?folder_id={$folder->id}");

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(1, $data);
        $this->assertEquals('in-folder', $data[0]['name']);
    }

    #[Test]
    public function media_list_excludes_avatar_collections()
    {
        // Create avatar media (should be excluded)
        $mediaLibrary = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => null,
            'name' => 'Avatar Library',
        ]);
        $mediaLibrary->addMedia(UploadedFile::fake()->image('avatar.jpg'))
            ->toMediaCollection('avatar');

        // Create normal media
        $normalLibrary = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => null,
            'name' => 'Normal Library',
        ]);
        $normalLibrary->addMedia(UploadedFile::fake()->image('normal.jpg'))
            ->toMediaCollection('default');

        $response = $this->getJson('/api/superadmin/media');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Should only return the normal media, not avatar
        $this->assertCount(1, $data);
        $this->assertEquals('normal', $data[0]['name']);
    }

    #[Test]
    public function user_can_delete_media()
    {
        $mediaLibrary = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => null,
            'name' => 'Delete Test Library',
        ]);

        $media = $mediaLibrary->addMedia(UploadedFile::fake()->image('delete-test.jpg'))
            ->toMediaCollection('default');

        $response = $this->deleteJson("/api/superadmin/media/{$media->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Media deleted successfully',
            ]);

        $this->assertDatabaseMissing('media', [
            'id' => $media->id,
        ]);
    }

    #[Test]
    public function user_can_create_folder()
    {
        $response = $this->postJson('/api/superadmin/media-folders', [
            'name' => 'New Folder',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Folder created successfully.',
                'folder' => [
                    'name' => 'New Folder',
                    'tenant_id' => null,
                    'parent_id' => null,
                ],
            ]);

        $this->assertDatabaseHas('media_folders', [
            'name' => 'New Folder',
            'tenant_id' => null,
            'parent_id' => null,
        ]);
    }

    #[Test]
    public function user_can_create_nested_folder()
    {
        $parentFolder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Parent Folder',
            'parent_id' => null,
        ]);

        $response = $this->postJson('/api/superadmin/media-folders', [
            'name' => 'Child Folder',
            'parent_id' => $parentFolder->id,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('media_folders', [
            'name' => 'Child Folder',
            'parent_id' => $parentFolder->id,
        ]);
    }

    #[Test]
    public function cannot_create_duplicate_folder_name_in_same_location()
    {
        MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Existing Folder',
            'parent_id' => null,
        ]);

        $response = $this->postJson('/api/superadmin/media-folders', [
            'name' => 'Existing Folder',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function can_create_same_folder_name_in_different_locations()
    {
        $parentFolder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Parent',
            'parent_id' => null,
        ]);

        // Create "Documents" in root
        MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Documents',
            'parent_id' => null,
        ]);

        // Create "Documents" inside "Parent" (should be allowed)
        $response = $this->postJson('/api/superadmin/media-folders', [
            'name' => 'Documents',
            'parent_id' => $parentFolder->id,
        ]);

        $response->assertStatus(201);

        $this->assertEquals(2, MediaFolder::where('name', 'Documents')->count());
    }

    #[Test]
    public function user_can_rename_folder()
    {
        $folder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Old Name',
            'parent_id' => null,
        ]);

        $response = $this->putJson("/api/superadmin/media-folders/{$folder->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Folder updated successfully.',
                'folder' => [
                    'name' => 'New Name',
                ],
            ]);

        $this->assertDatabaseHas('media_folders', [
            'id' => $folder->id,
            'name' => 'New Name',
        ]);
    }

    #[Test]
    public function cannot_rename_folder_to_duplicate_name()
    {
        MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Existing Name',
            'parent_id' => null,
        ]);

        $folder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Current Name',
            'parent_id' => null,
        ]);

        $response = $this->putJson("/api/superadmin/media-folders/{$folder->id}", [
            'name' => 'Existing Name',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function user_can_delete_empty_folder()
    {
        $folder = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Empty Folder',
            'parent_id' => null,
        ]);

        $response = $this->deleteJson("/api/superadmin/media-folders/{$folder->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Folder and all contents deleted successfully.',
            ]);

        $this->assertDatabaseMissing('media_folders', [
            'id' => $folder->id,
        ]);
    }

    #[Test]
    public function deleting_folder_cascades_to_subfolders_and_media()
    {
        // Create folder structure: Parent > Child > Grandchild
        $parent = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Parent',
            'parent_id' => null,
        ]);

        $child = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Child',
            'parent_id' => $parent->id,
        ]);

        $grandchild = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Grandchild',
            'parent_id' => $child->id,
        ]);

        // Add media to each folder
        $parentMedia = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => $parent->id,
            'name' => 'Parent Library',
        ]);
        $parentMedia->addMedia(UploadedFile::fake()->image('parent.jpg'))
            ->toMediaCollection('default');

        $childMedia = MediaLibrary::create([
            'uploaded_by' => $this->user->id,
            'tenant_id' => null,
            'folder_id' => $child->id,
            'name' => 'Child Library',
        ]);
        $childMedia->addMedia(UploadedFile::fake()->image('child.jpg'))
            ->toMediaCollection('default');

        // Delete parent folder
        $response = $this->deleteJson("/api/superadmin/media-folders/{$parent->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'stats' => [
                    'folders_deleted',
                    'files_deleted',
                ],
            ]);

        $stats = $response->json('stats');
        $this->assertEquals(3, $stats['folders_deleted']); // Parent, Child, Grandchild
        $this->assertEquals(2, $stats['files_deleted']); // parent.jpg, child.jpg

        // Verify all folders are deleted
        $this->assertDatabaseMissing('media_folders', ['id' => $parent->id]);
        $this->assertDatabaseMissing('media_folders', ['id' => $child->id]);
        $this->assertDatabaseMissing('media_folders', ['id' => $grandchild->id]);

        // Verify media is deleted
        $this->assertCount(0, Media::all());
    }

    #[Test]
    public function user_can_list_all_folders()
    {
        MediaFolder::create(['tenant_id' => null, 'name' => 'Folder 1', 'parent_id' => null]);
        MediaFolder::create(['tenant_id' => null, 'name' => 'Folder 2', 'parent_id' => null]);

        $response = $this->getJson('/api/superadmin/media-folders');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'parent_id',
                        'created_at',
                    ],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function user_can_get_folder_tree()
    {
        $parent = MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Parent',
            'parent_id' => null,
        ]);

        MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Child 1',
            'parent_id' => $parent->id,
        ]);

        MediaFolder::create([
            'tenant_id' => null,
            'name' => 'Child 2',
            'parent_id' => $parent->id,
        ]);

        $response = $this->getJson('/api/superadmin/media-folders-tree');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'children',
                    ],
                ],
            ]);

        $tree = $response->json('data');
        $this->assertCount(1, $tree); // Only root folders
        $this->assertCount(2, $tree[0]['children']); // Two children
    }
}

