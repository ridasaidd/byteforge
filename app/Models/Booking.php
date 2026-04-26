<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PENDING_HOLD = 'pending_hold';
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_NO_SHOW = 'no_show';

    public const CANCELLED_BY_CUSTOMER = 'customer';
    public const CANCELLED_BY_TENANT = 'tenant';

    public const ACTOR_SYSTEM = 'system';
    public const ACTOR_TENANT_USER = 'tenant_user';
    public const ACTOR_CUSTOMER = 'customer';

    /** @var list<string> */
    protected $hidden = ['management_token'];

    /** @var list<string> */
    protected $fillable = [
        'tenant_id',
        'service_id',
        'resource_id',
        'guest_user_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'starts_at',
        'ends_at',
        'status',
        'hold_expires_at',
        'parent_booking_id',
        'management_token',
        'token_expires_at',
        'notification_opt_out',
        'payment_id',
        'internal_notes',
        'customer_notes',
        'cancelled_at',
        'cancelled_by',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'hold_expires_at' => 'datetime',
        'token_expires_at' => 'datetime',
        'notification_opt_out' => 'boolean',
        'cancelled_at' => 'datetime',
    ];

    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public function recordEvent(
        string $toStatus,
        string $actorType,
        ?int $actorId = null,
        ?string $fromStatus = null,
        ?string $note = null,
    ): BookingEvent {
        return $this->events()->create([
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'note' => $note,
        ]);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(BookingService::class, 'service_id');
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(BookingResource::class, 'resource_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function guestUser(): BelongsTo
    {
        return $this->belongsTo(GuestUser::class, 'guest_user_id');
    }

    public function parentBooking(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_booking_id');
    }

    public function childBookings(): HasMany
    {
        return $this->hasMany(self::class, 'parent_booking_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(BookingEvent::class, 'booking_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(BookingNotification::class, 'booking_id');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('starts_at', '>=', now());
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    public function scopeForGuest(Builder $query, int $guestUserId): Builder
    {
        return $query->where('guest_user_id', $guestUserId);
    }
}
