<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Stancl\Tenancy\Database\Models\Domain;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant
{
    use HasFactory, LogsActivity;

    /**
     * Get the domains for the tenant.
     */
    public function domains()
    {
        return $this->hasMany(Domain::class, 'tenant_id');
    }

    /**
     * Tell Stancl Tenancy which columns are custom top-level columns.
     */
    public static function getCustomColumns(): array
    {
        return ['id', 'name', 'slug'];
    }

    protected $fillable = [
        'id',
        'name',
        'slug',
        'data',
    ];

    /**
     * Get the memberships for the tenant.
     */
    public function memberships()
    {
        return $this->hasMany(Membership::class, 'tenant_id', 'id');
    }

    /**
     * Get the users that belong to the tenant.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'memberships');
    }

    /**
     * Configure activity logging
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('central');
    }
}
