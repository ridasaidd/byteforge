<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Workshop model — represents a car mechanic workshop listed by a mechanic user.
 *
 * Belongs to a tenant (via tenant_id) and optionally linked to the mechanic's
 * user account (user_id).  Location search is done with the Haversine formula
 * via the nearbyWithinKm() scope so no PostGIS extension is required.
 */
class Workshop extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'name',
        'description',
        'phone',
        'email',
        'website',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'latitude',
        'longitude',
        'specializations',
        'opening_hours',
        'is_active',
        'is_verified',
    ];

    protected $casts = [
        'specializations' => 'array',
        'opening_hours' => 'array',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The tenant that owns this workshop listing.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    /**
     * The mechanic user who manages this workshop.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // -------------------------------------------------------------------------
    // Query Scopes
    // -------------------------------------------------------------------------

    /**
     * Scope to active workshops only.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to workshops within a given radius (km) of a lat/lng point using
     * the Haversine formula — works on MySQL and SQLite without extensions.
     *
     * Adds a virtual "distance_km" column to each result row.
     *
     * @param  float  $latitude  Centre point latitude
     * @param  float  $longitude  Centre point longitude
     * @param  float  $radiusKm  Search radius in kilometres (default 50)
     */
    public function scopeNearbyWithinKm(Builder $query, float $latitude, float $longitude, float $radiusKm = 50.0): Builder
    {
        // Haversine formula — Earth radius 6 371 km
        $haversine = '(6371 * ACOS(
            COS(RADIANS(?)) * COS(RADIANS(latitude)) *
            COS(RADIANS(longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(latitude))
        ))';

        return $query
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->selectRaw("*, {$haversine} AS distance_km", [$latitude, $longitude, $latitude])
            ->having('distance_km', '<=', $radiusKm)
            ->orderBy('distance_km');
    }

    // -------------------------------------------------------------------------
    // Activity Logging
    // -------------------------------------------------------------------------

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'city', 'is_active', 'is_verified'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('tenant');
    }
}
