<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingNotification extends Model
{
    use HasFactory;

    // Append-only: no updates ever happen to this table
    public const UPDATED_AT = null;

    public const CHANNEL_EMAIL = 'email';
    public const CHANNEL_PUSH = 'push';
    public const CHANNEL_SMS = 'sms';

    public const RECIPIENT_CUSTOMER = 'customer';
    public const RECIPIENT_STAFF = 'staff';
    public const RECIPIENT_ADMIN = 'admin';

    /** @var list<string> */
    protected $fillable = [
        'booking_id',
        'type',
        'channel',
        'recipient',
        'sent_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }
}
