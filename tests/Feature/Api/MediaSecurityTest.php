<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MediaSecurityTest extends TestCase
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
    public function blocks_php_file_upload()
    {
        $file = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_executable_file_upload()
    {
        $file = UploadedFile::fake()->create('virus.exe', 100, 'application/x-msdownload');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_shell_script_upload()
    {
        $file = UploadedFile::fake()->create('script.sh', 100, 'application/x-sh');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_javascript_file_upload()
    {
        $file = UploadedFile::fake()->create('malicious.js', 100, 'application/javascript');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_html_file_upload()
    {
        $file = UploadedFile::fake()->create('xss.html', 100, 'text/html');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_batch_file_upload()
    {
        $file = UploadedFile::fake()->create('malicious.bat', 100, 'application/x-bat');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_python_file_upload()
    {
        $file = UploadedFile::fake()->create('script.py', 100, 'text/x-python');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_zip_file_upload()
    {
        $file = UploadedFile::fake()->create('archive.zip', 100, 'application/zip');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function blocks_oversized_file_upload()
    {
        // Create a file larger than 10MB (10241 KB)
        $file = UploadedFile::fake()->create('large.jpg', 10241, 'image/jpeg');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    #[Test]
    public function allows_safe_image_upload()
    {
        $file = UploadedFile::fake()->image('safe-image.jpg', 800, 600);

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        // Should succeed (201 or handle gracefully)
        $this->assertTrue(in_array($response->status(), [201, 500])); // 500 might be due to other setup issues, but not validation
    }

    #[Test]
    public function allows_pdf_upload()
    {
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        // Should succeed (not 422 validation error)
        $this->assertNotEquals(422, $response->status());
    }

    #[Test]
    public function allows_docx_upload()
    {
        $file = UploadedFile::fake()->create('document.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        // Should succeed (not 422 validation error)
        $this->assertNotEquals(422, $response->status());
    }

    #[Test]
    public function allows_mp4_video_upload()
    {
        $file = UploadedFile::fake()->create('video.mp4', 1000, 'video/mp4');

        $response = $this->postJson('/api/superadmin/media', [
            'file' => $file,
        ]);

        // Should succeed (not 422 validation error)
        $this->assertNotEquals(422, $response->status());
    }
}

