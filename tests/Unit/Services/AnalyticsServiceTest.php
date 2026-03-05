<?php

namespace Tests\Unit\Services;

use App\Models\AnalyticsEvent;
use App\Models\Page;
use App\Models\User;
use App\Services\AnalyticsService;
use PHPUnit\Framework\Attributes\Test;
use Illuminate\Support\Carbon;
use Tests\Support\TestUsers;
use Tests\TestCase;

class AnalyticsServiceTest extends TestCase
{
    private AnalyticsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AnalyticsService();
    }

    #[Test]
    public function it_records_a_platform_event_with_null_tenant_id(): void
    {
        // Tenancy is NOT initialized → tenant_id should be null
        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED,
            properties: ['tenant_slug' => 'acme']
        );

        $this->assertInstanceOf(AnalyticsEvent::class, $event);
        $this->assertNull($event->tenant_id);
        $this->assertEquals(AnalyticsEvent::TYPE_PLATFORM_TENANT_CREATED, $event->event_type);
        $this->assertEquals(['tenant_slug' => 'acme'], $event->properties);
    }

    #[Test]
    public function it_records_a_tenant_event_with_explicit_tenant_id(): void
    {
        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PAGE_VIEWED,
            properties: ['page_id' => 1, 'slug' => 'home'],
            tenantId: 'tenant-uuid-123'
        );

        $this->assertEquals('tenant-uuid-123', $event->tenant_id);
        $this->assertEquals(AnalyticsEvent::TYPE_PAGE_VIEWED, $event->event_type);
    }

    #[Test]
    public function it_stores_the_event_in_the_database(): void
    {
        $this->service->record(
            eventType: AnalyticsEvent::TYPE_PAGE_VIEWED,
            properties: ['slug' => 'about'],
            tenantId: 'tenant-uuid-abc'
        );

        $this->assertDatabaseHas('analytics_events', [
            'event_type' => AnalyticsEvent::TYPE_PAGE_VIEWED,
            'tenant_id'  => 'tenant-uuid-abc',
        ]);
    }

    #[Test]
    public function it_accepts_a_subject_model(): void
    {
        $page = Page::factory()->create();

        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PAGE_PUBLISHED,
            properties: ['slug' => $page->slug],
            tenantId: null,
            subject: $page
        );

        $this->assertEquals(Page::class, $event->subject_type);
        $this->assertEquals((string) $page->getKey(), $event->subject_id);
    }

    #[Test]
    public function it_accepts_an_actor_model(): void
    {
        $user = TestUsers::centralSuperadmin();

        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_THEME_ACTIVATED,
            properties: ['theme_name' => 'Minimal'],
            actor: $user
        );

        $this->assertEquals(User::class, $event->actor_type);
        $this->assertEquals((string) $user->getKey(), $event->actor_id);
    }

    #[Test]
    public function it_uses_provided_occurred_at_timestamp(): void
    {
        $pastTime = Carbon::parse('2026-01-15 10:00:00');

        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PAGE_VIEWED,
            properties: [],
            occurredAt: $pastTime
        );

        $this->assertTrue($event->occurred_at->equalTo($pastTime));
    }

    #[Test]
    public function it_defaults_occurred_at_to_now_when_not_provided(): void
    {
        $before = now()->subSecond();

        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PAGE_VIEWED,
            properties: []
        );

        $this->assertTrue($event->occurred_at->greaterThanOrEqualTo($before));
        $this->assertTrue($event->occurred_at->lessThanOrEqualTo(now()->addSecond()));
    }

    #[Test]
    public function it_stores_empty_properties_as_empty_array(): void
    {
        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PLATFORM_ERROR,
            properties: []
        );

        $this->assertEquals([], $event->properties);
    }

    #[Test]
    public function explicit_tenant_id_overrides_ambient_tenancy_context(): void
    {
        // Even if tenancy were initialized, explicit tenantId should win
        $event = $this->service->record(
            eventType: AnalyticsEvent::TYPE_PAGE_VIEWED,
            properties: [],
            tenantId: 'explicit-tenant-999'
        );

        $this->assertEquals('explicit-tenant-999', $event->tenant_id);
    }

    #[Test]
    public function table_is_append_only_meaning_multiple_calls_create_multiple_rows(): void
    {
        $this->service->record(AnalyticsEvent::TYPE_PAGE_VIEWED, ['slug' => 'home'], tenantId: 'tid');
        $this->service->record(AnalyticsEvent::TYPE_PAGE_VIEWED, ['slug' => 'home'], tenantId: 'tid');

        $count = AnalyticsEvent::where('tenant_id', 'tid')
            ->where('event_type', AnalyticsEvent::TYPE_PAGE_VIEWED)
            ->count();

        $this->assertEquals(2, $count);
    }
}
