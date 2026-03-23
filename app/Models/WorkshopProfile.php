<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkshopProfile extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'display_name',
        'tagline',
        'description',
        'phone',
        'email',
        'website',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'latitude',
        'longitude',
        'specializations',
        'opening_hours',
        'is_listed',
        'is_verified',
        'rating_avg',
        'review_count',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'specializations' => 'array',
        'opening_hours' => 'array',
        'is_listed' => 'boolean',
        'is_verified' => 'boolean',
        'rating_avg' => 'decimal:2',
        'review_count' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(WorkshopReview::class);
    }

    /**
     * Recalculate and persist aggregated rating stats.
     */
    public function recalculateRating(): void
    {
        $aggregate = $this->reviews()->selectRaw('COUNT(*) as cnt, AVG(rating) as avg')->first();

        $this->update([
            'review_count' => (int) $aggregate->cnt,
            'rating_avg' => $aggregate->cnt > 0 ? round((float) $aggregate->avg, 2) : null,
        ]);
    }

    /**
     * Scope: only publicly listed workshops.
     */
    public function scopeListed(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('is_listed', true);
    }

    /**
     * Scope: filter by specialization slug.
     */
    public function scopeHasSpecialization(\Illuminate\Database\Eloquent\Builder $query, string $specialization): \Illuminate\Database\Eloquent\Builder
    {
        return $query->whereJsonContains('specializations', $specialization);
    }

    /**
     * Scope: proximity search using the Haversine formula.
     *
     * Returns workshops within $radiusKm kilometres of the given coordinates,
     * ordered nearest-first. Both latitude and longitude must be non-null.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  float  $lat  Searcher latitude in decimal degrees
     * @param  float  $lng  Searcher longitude in decimal degrees
     * @param  float  $radiusKm  Search radius in kilometres (default 50)
     */
    public function scopeNearby($query, float $lat, float $lng, float $radiusKm = 50.0)
    {
        $lat = round($lat, 7);
        $lng = round($lng, 7);
        $radiusKm = max(0.1, min($radiusKm, 500.0)); // clamp: 0.1 – 500 km

        return $query
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->selectRaw(
                '*, ( 6371 * ACOS( COS( RADIANS(?) ) * COS( RADIANS(latitude) )
                    * COS( RADIANS(longitude) - RADIANS(?) )
                    + SIN( RADIANS(?) ) * SIN( RADIANS(latitude) ) ) ) AS distance_km',
                [$lat, $lng, $lat]
            )
            ->having('distance_km', '<=', $radiusKm)
            ->orderBy('distance_km');
    }
}
