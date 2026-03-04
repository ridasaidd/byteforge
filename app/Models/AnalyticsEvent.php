<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Append-only analytics event log.
 *
 * Isolation contract:
 *   - tenant_id = NULL  → platform/central event (superadmin only)
 *   - tenant_id = UUID  → tenant-scoped event (visible to that tenant only)
 *
 * This table is NEVER updated. Corrections are new corrective events.
 *
 * @property int         $id
 * @property string|null $tenant_id
 * @property string      $event_type
 * @property string|null $subject_type
 * @property string|null $subject_id
 * @property string|null $actor_type
 * @property string|null $actor_id
 * @property array       $properties
 * @property Carbon      $occurred_at
 * @property Carbon      $created_at
 */
class AnalyticsEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'event_type',
        'subject_type',
        'subject_id',
        'actor_type',
        'actor_id',
        'properties',
        'occurred_at',
        'created_at',
    ];

    protected $casts = [
        'properties'  => 'array',
        'occurred_at' => 'datetime',
        'created_at'  => 'datetime',
    ];

    // =========================================================================
    // Event Type Registry
    // Define all known types as constants so both PHP and tests stay in sync.
    // Only page.* types have active aggregation logic in Phase 9.
    // booking.* and payment.* are pre-registered for Phase 10/11.
    // =========================================================================

    // Platform events (tenant_id = NULL)
    const TYPE_PLATFORM_TENANT_CREATED         = 'tenant.created';
    const TYPE_PLATFORM_TENANT_DELETED         = 'tenant.deleted';
    const TYPE_PLATFORM_TENANT_ACTIVATED       = 'tenant.activated';
    const TYPE_PLATFORM_TENANT_SUSPENDED       = 'tenant.suspended';
    const TYPE_PLATFORM_SUBSCRIPTION_CREATED   = 'platform.subscription.created';
    const TYPE_PLATFORM_SUBSCRIPTION_CANCELLED = 'platform.subscription.cancelled';
    const TYPE_PLATFORM_ERROR                  = 'platform.error';

    // Tenant content events (tenant_id = UUID)
    const TYPE_PAGE_VIEWED      = 'page.viewed';
    const TYPE_PAGE_PUBLISHED   = 'page.published';
    const TYPE_THEME_ACTIVATED  = 'theme.activated';
    const TYPE_MEDIA_UPLOADED   = 'media.uploaded';

    // Phase 10 — defined now, no aggregation until Phase 10
    const TYPE_PAYMENT_CAPTURED = 'payment.captured';
    const TYPE_PAYMENT_REFUNDED = 'payment.refunded';
    const TYPE_PAYMENT_FAILED   = 'payment.failed';

    // Phase 11 — defined now, no aggregation until Phase 11
    const TYPE_BOOKING_CREATED   = 'booking.created';
    const TYPE_BOOKING_CONFIRMED = 'booking.confirmed';
    const TYPE_BOOKING_CANCELLED = 'booking.cancelled';
    const TYPE_BOOKING_COMPLETED = 'booking.completed';

    // =========================================================================
    // Query Scopes
    // =========================================================================

    /**
     * Events belonging to a specific tenant.
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Platform-level events only (tenant_id IS NULL).
     * Used exclusively by superadmin/central queries.
     */
    public function scopePlatformLevel(Builder $query): Builder
    {
        return $query->whereNull('tenant_id');
    }

    /**
     * Filter by event type.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('event_type', $type);
    }

    /**
     * Filter to events within a time range (inclusive on both boundaries).
     */
    public function scopeBetween(Builder $query, Carbon $from, Carbon $to): Builder
    {
        return $query->whereBetween('occurred_at', [$from, $to]);
    }
}
