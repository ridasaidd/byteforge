<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\MediaLibrary\MediaCollections\Models\Media as BaseMedia;

class Media extends BaseMedia
{
    use LogsActivity;
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
            } elseif (! tenancy()->initialized && ! $media->tenant_id) {
                // For central app, use a special identifier (null or 'central')
                $media->tenant_id = null;
            }
        });

        // Global scope to filter media by current tenant
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (tenancy()->initialized) {
                $builder->where('tenant_id', tenancy()->tenant->id);
            } else {
                // In central context, only show media without tenant_id
                $builder->whereNull('tenant_id');
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

    /**
     * Get human-readable file size.
     */
    public function getHumanReadableSizeAttribute(): string
    {
        $bytes = $this->size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2).' '.$units[$i];
    }

    /**
     * Configure activity logging
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'file_name', 'collection_name', 'size'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
