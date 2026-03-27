<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MechanicWorkshop extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'owner_user_id',
        'name',
        'slug',
        'description',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'latitude',
        'longitude',
        'phone',
        'email',
        'website',
        'status',
        'rating_average',
        'rating_count',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'rating_average' => 'float',
        'rating_count' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(MechanicService::class, 'workshop_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(MechanicReview::class, 'workshop_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(MechanicBooking::class, 'workshop_id');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to filter workshops within a given radius (km) of a coordinate.
     * Uses the Haversine formula via raw SQL for performance.
     */
    public function scopeNearby(Builder $query, float $lat, float $lng, float $radiusKm = 50): Builder
    {
        return $query
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->selectRaw(
                "*, ( 6371 * acos( cos( radians(?) ) * cos( radians(latitude) ) * cos( radians(longitude) - radians(?) ) + sin( radians(?) ) * sin( radians(latitude) ) ) ) AS distance_km",
                [$lat, $lng, $lat]
            )
            ->having('distance_km', '<=', $radiusKm)
            ->orderBy('distance_km');
    }

    /**
     * Recalculate and persist the aggregate rating for this workshop.
     */
    public function recalculateRating(): void
    {
        $stats = $this->reviews()
            ->where('status', 'published')
            ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as total')
            ->first();

        $this->update([
            'rating_average' => round((float) ($stats->avg_rating ?? 0), 2),
            'rating_count' => (int) ($stats->total ?? 0),
        ]);
    }
}
