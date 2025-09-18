<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Navigation extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'structure',
        'status',
        'sort_order',
        'created_by',
    ];

    /**
     * Get the tenant that owns the navigation.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    /**
     * Get the user who created the navigation.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
