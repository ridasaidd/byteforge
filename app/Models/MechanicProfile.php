<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * MechanicProfile
 *
 * Stores location and workshop details for a mechanic tenant.
 * In the mechanics-as-tenants architecture, each car workshop is a ByteForge tenant
 * and this model holds the domain-specific data needed for marketplace search.
 *
 * @property int         $id
 * @property string      $tenant_id
 * @property string|null $address
 * @property string|null $city
 * @property string|null $state
 * @property string|null $country
 * @property string|null $postal_code
 * @property float|null  $latitude
 * @property float|null  $longitude
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $website
 * @property string|null $description
 * @property array|null  $services
 * @property array|null  $business_hours
 * @property bool        $is_active
 * @property bool        $is_verified
 */
class MechanicProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
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
        'description',
        'services',
        'business_hours',
        'is_active',
        'is_verified',
    ];

    protected $casts = [
        'latitude'       => 'float',
        'longitude'      => 'float',
        'services'       => 'array',
        'business_hours' => 'array',
        'is_active'      => 'boolean',
        'is_verified'    => 'boolean',
    ];

    // =========================================================================
    // Relationships
    // =========================================================================

    /**
     * The tenant (mechanic workshop) that owns this profile.
     */
    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    // =========================================================================
    // Query Scopes
    // =========================================================================

    /**
     * Only return active mechanic profiles.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Only return verified mechanic profiles.
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('is_verified', true);
    }

    /**
     * Filter by city name (case-insensitive).
     */
    public function scopeInCity(Builder $query, string $city): Builder
    {
        return $query->whereRaw('LOWER(city) = ?', [strtolower($city)]);
    }

    /**
     * Filter by country (case-insensitive).
     */
    public function scopeInCountry(Builder $query, string $country): Builder
    {
        return $query->whereRaw('LOWER(country) = ?', [strtolower($country)]);
    }

    /**
     * Filter mechanics that offer a specific service (JSON array search).
     */
    public function scopeOffersService(Builder $query, string $service): Builder
    {
        return $query->whereJsonContains('services', $service);
    }

    /**
     * Only return profiles that have GPS coordinates set.
     */
    public function scopeWithCoordinates(Builder $query): Builder
    {
        return $query->whereNotNull('latitude')->whereNotNull('longitude');
    }

    /**
     * Bounding-box pre-filter before Haversine distance calculation.
     * Reduces the result set without expensive trig operations.
     *
     * @param float $lat      Center latitude
     * @param float $lng      Center longitude
     * @param float $radiusKm Search radius in kilometres
     */
    public function scopeWithinBoundingBox(Builder $query, float $lat, float $lng, float $radiusKm): Builder
    {
        // 1 degree of latitude ≈ 111 km; longitude varies by latitude
        $latDelta = $radiusKm / 111.0;
        $lngDelta = $radiusKm / (111.0 * cos(deg2rad($lat)));

        return $query
            ->whereBetween('latitude',  [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('longitude', [$lng - $lngDelta, $lng + $lngDelta]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Calculate the Haversine great-circle distance (in km) from this profile
     * to the given coordinates.
     */
    public function distanceTo(float $lat, float $lng): ?float
    {
        if ($this->latitude === null || $this->longitude === null) {
            return null;
        }

        $earthRadius = 6371.0; // km
        $dLat        = deg2rad($lat - $this->latitude);
        $dLng        = deg2rad($lng - $this->longitude);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($this->latitude)) * cos(deg2rad($lat)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * asin(sqrt($a));
    }
}
