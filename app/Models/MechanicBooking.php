<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MechanicBooking extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'workshop_id',
        'service_id',
        'customer_user_id',
        'scheduled_at',
        'status',
        'notes',
        'cancellation_reason',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'scheduled_at' => 'datetime',
    ];

    public function workshop(): BelongsTo
    {
        return $this->belongsTo(MechanicWorkshop::class, 'workshop_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(MechanicService::class, 'service_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function scopeForWorkshop(Builder $query, int $workshopId): Builder
    {
        return $query->where('workshop_id', $workshopId);
    }

    public function scopeForCustomer(Builder $query, int $userId): Builder
    {
        return $query->where('customer_user_id', $userId);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('scheduled_at', '>=', now())
            ->whereIn('status', ['pending', 'confirmed']);
    }
}
