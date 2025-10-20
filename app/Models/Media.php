<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Spatie\MediaLibrary\MediaCollections\Models\Media as BaseMedia;

class Media extends BaseMedia
{
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'manipulations' => 'array',
        'custom_properties' => 'array',
        'generated_conversions' => 'array',
        'responsive_images' => 'array',
    ];

    /**
     * Boot the model and apply tenant scoping.
     */
    protected static function booted(): void
    {
        // Automatically set tenant_id when creating media
        static::creating(function (Media $media) {
            if (tenancy()->initialized && ! $media->tenant_id) {
                $media->tenant_id = tenancy()->tenant->id;
            }
        });

        // Global scope to filter media by current tenant
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (tenancy()->initialized) {
                $builder->where('tenant_id', tenancy()->tenant->id);
            }
        });
    }

    /**
     * Relationship to tenant.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Scope to get media for a specific tenant (bypasses global scope).
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->withoutGlobalScope('tenant')->where('tenant_id', $tenantId);
    }
}
