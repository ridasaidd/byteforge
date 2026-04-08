<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingEvent extends Model
{
    use HasFactory;

    // Append-only immutable event log — never updated, never soft-deleted
    public const UPDATED_AT = null;

    public const ACTOR_SYSTEM = 'system';
    public const ACTOR_TENANT_USER = 'tenant_user';
    public const ACTOR_CUSTOMER = 'customer';

    /** @var list<string> */
    protected $fillable = [
        'booking_id',
        'from_status',
        'to_status',
        'actor_type',
        'actor_id',
        'note',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'actor_id' => 'integer',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }
}
