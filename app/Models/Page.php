<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Page extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'title',
        'slug',
        'page_type',
        'puck_data',
        'meta_data',
        'status',
        'is_homepage',
        'sort_order',
        'created_by',
        'published_at',
    ];

    /**
     * Get the tenant that owns the page.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'puck_data' => 'array',
            'meta_data' => 'array',
            'is_homepage' => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}
