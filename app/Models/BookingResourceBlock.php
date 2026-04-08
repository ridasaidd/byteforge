<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingResourceBlock extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'resource_id',
        'start_date',
        'end_date',
        'reason',
        'created_by',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(BookingResource::class, 'resource_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForResource(Builder $query, int $resourceId): Builder
    {
        return $query->where('resource_id', $resourceId);
    }

    public function scopeOverlapping(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate);
    }
}
