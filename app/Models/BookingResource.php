<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingResource extends Model
{
    use HasFactory;

    public const TYPE_PERSON = 'person';
    public const TYPE_SPACE = 'space';
    public const TYPE_EQUIPMENT = 'equipment';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id',
        'name',
        'type',
        'description',
        'checkin_time',
        'checkout_time',
        'capacity',
        'resource_label',
        'user_id',
        'is_active',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'capacity' => 'integer',
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(
            BookingService::class,
            'booking_resource_services',
            'resource_id',
            'service_id',
        );
    }

    public function availabilities(): HasMany
    {
        return $this->hasMany(BookingAvailability::class, 'resource_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(BookingResourceBlock::class, 'resource_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'resource_id');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
