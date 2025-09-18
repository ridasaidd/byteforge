<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Stancl\Tenancy\Database\Models\Domain;
class Tenant extends BaseTenant
{
    use HasFactory;

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
}
