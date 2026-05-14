<?php

declare(strict_types=1);

namespace Tests\Tenant\Feature\Api;

use App\Models\Tenant;
use App\Notifications\FormSubmissionNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestUsers;
use Tests\TestCase;

class TenantFormSubmissionTest extends TestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = TestUsers::tenant('tenant-one');
    }

    private function tenantUrl(string $path): string
    {
        $domain = $this->tenant->domains()->first()?->domain ?? 'tenant-one.dev.byteforge.se';

        return "http://{$domain}{$path}";
    }

    #[Test]
    public function public_form_submission_endpoint_sends_email_notification(): void
    {
        Notification::fake();

        $response = $this->postJson($this->tenantUrl('/api/form-submit/email'), [
            'to' => 'contact@example.com',
            'formName' => 'Contact Us',
            'website' => '',
            'values' => [
                'name' => 'Alice Example',
                'email' => 'alice@example.com',
                'message' => "Hello from the storefront\nSecond line",
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('sent', true);

        Notification::assertSentOnDemand(FormSubmissionNotification::class);
    }

    #[Test]
    public function public_form_submission_endpoint_validates_payload(): void
    {
        Notification::fake();

        $response = $this->postJson($this->tenantUrl('/api/form-submit/email'), [
            'to' => 'not-an-email',
            'formName' => '',
            'website' => '',
            'values' => 'invalid',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['to', 'formName', 'values']);

        Notification::assertNothingSent();
    }

    #[Test]
    public function public_form_submission_endpoint_rejects_filled_honeypot_field(): void
    {
        Notification::fake();

        $response = $this->postJson($this->tenantUrl('/api/form-submit/email'), [
            'to' => 'contact@example.com',
            'formName' => 'Contact Us',
            'website' => 'https://spam.example',
            'values' => [
                'name' => 'Alice Example',
                'message' => 'Hello from a bot',
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['website']);

        Notification::assertNothingSent();
    }
}
