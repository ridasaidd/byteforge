<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingService extends Model
{
    use HasFactory;

    public const MODE_SLOT = 'slot';
    public const MODE_RANGE = 'range';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'booking_mode',
        'duration_minutes',
        'slot_interval_minutes',
        'min_nights',
        'max_nights',
        'buffer_minutes',
        'advance_notice_hours',
        'max_advance_days',
        'price',
        'currency',
        'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'duration_minutes' => 'integer',
        'slot_interval_minutes' => 'integer',
        'min_nights' => 'integer',
        'max_nights' => 'integer',
        'buffer_minutes' => 'integer',
        'advance_notice_hours' => 'integer',
        'max_advance_days' => 'integer',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function resources(): BelongsToMany
    {
        return $this->belongsToMany(
            BookingResource::class,
            'booking_resource_services',
            'service_id',
            'resource_id',
        );
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'service_id');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeSlot(Builder $query): Builder
    {
        return $query->where('booking_mode', self::MODE_SLOT);
    }

    public function scopeRange(Builder $query): Builder
    {
        return $query->where('booking_mode', self::MODE_RANGE);
    }
}
