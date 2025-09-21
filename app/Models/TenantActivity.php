<?php

namespace App\Models;

use Spatie\Activitylog\Models\Activity as SpatieActivity;
use Stancl\Tenancy\Facades\Tenancy;

class TenantActivity extends SpatieActivity
{
    // Optionally: add guarded/fillable etc if needed
    // protected $guarded = [];

    // If you want to cast properties etc
    protected $casts = [
        'properties' => 'collection',
    ];

    // If you want to add tenant_id when creating
    protected static function booted()
    {
        static::creating(function ($activity) {
            // set tenant_id (or whatever your tenant key is), or null if none
            $activity->tenant_id = Tenancy::getTenant()?->getTenantKey();
        });
    }

    /**
     * Scope to get logs for the current tenant
     */
    public function scopeForTenant($query, $tenantId = null)
    {
        $tenantId = $tenantId ?? Tenancy::getTenant()?->getTenantKey();
        return $query->where('tenant_id', $tenantId);
    }
}
