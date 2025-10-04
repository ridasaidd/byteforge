<?php

namespace App\Models;

use Spatie\Activitylog\Models\Activity as SpatieActivity;

class TenantActivity extends SpatieActivity
{
    protected $casts = [
        'properties' => 'collection',
    ];

    // If you want to add tenant_id when creating
    protected static function booted()
    {
        static::creating(function ($activity) {
            // set tenant_id from tenancy helper
            if (tenancy()->initialized) {
                $activity->tenant_id = tenancy()->tenant->getTenantKey();
            }
        });
    }

    /**
     * Scope to get logs for the current tenant
     */
    public function scopeForTenant($query, $tenantId = null)
    {
        if ($tenantId === null && tenancy()->initialized) {
            $tenantId = tenancy()->tenant->getTenantKey();
        }
        return $query->where('tenant_id', $tenantId);
    }
}
