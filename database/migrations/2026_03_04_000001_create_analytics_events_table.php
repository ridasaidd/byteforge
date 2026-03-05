<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();

            // NULL = platform/central event, UUID string = tenant event
            // No foreign key intentionally — keeps the table append-only and
            // fast under high insert load (matches activity_log pattern).
            $table->string('tenant_id', 255)->nullable()->index();

            $table->string('event_type', 100);

            // Optional polymorphic subject (e.g. Page, Theme)
            $table->string('subject_type', 255)->nullable();
            $table->string('subject_id', 255)->nullable();

            // Optional actor (User, System, Guest)
            $table->string('actor_type', 255)->nullable();
            $table->string('actor_id', 255)->nullable();

            // Arbitrary event payload — shape is per-event-type
            $table->json('properties');

            // Separate from created_at so queued events retain the correct time
            $table->timestamp('occurred_at');

            $table->timestamp('created_at')->useCurrent();

            // Composite indexes for the three most common query patterns
            $table->index(['tenant_id', 'event_type'],   'idx_tenant_type');
            $table->index(['tenant_id', 'occurred_at'],  'idx_tenant_occurred');
            $table->index(['event_type', 'occurred_at'], 'idx_event_type_occurred');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
