<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingAvailability extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'resource_id',
        'day_of_week',
        'specific_date',
        'starts_at',
        'ends_at',
        'is_blocked',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'day_of_week' => 'integer',
        'specific_date' => 'date',
        'is_blocked' => 'boolean',
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(BookingResource::class, 'resource_id');
    }

    public function scopeForResource(Builder $query, int $resourceId): Builder
    {
        return $query->where('resource_id', $resourceId);
    }

    public function scopeRecurring(Builder $query): Builder
    {
        return $query->whereNotNull('day_of_week')->whereNull('specific_date');
    }

    public function scopeSpecific(Builder $query): Builder
    {
        return $query->whereNotNull('specific_date');
    }
}
