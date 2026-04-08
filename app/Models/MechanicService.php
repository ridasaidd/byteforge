<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MechanicService extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'workshop_id',
        'name',
        'description',
        'price_min',
        'price_max',
        'currency',
        'duration_minutes',
        'is_active',
        'sort_order',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'price_min' => 'integer',
        'price_max' => 'integer',
        'duration_minutes' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function workshop(): BelongsTo
    {
        return $this->belongsTo(MechanicWorkshop::class, 'workshop_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
