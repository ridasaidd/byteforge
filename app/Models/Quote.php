<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    use HasFactory;

    protected ?string $plainPublicToken = null;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SENT = 'sent';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_CONVERTED = 'converted';

    /** @var list<string> */
    protected $hidden = ['public_token_hash'];

    /** @var list<string> */
    protected $fillable = [
        'tenant_id',
        'quote_request_id',
        'version',
        'booking_service_id',
        'created_by_user_id',
        'sent_by_user_id',
        'currency',
        'subtotal_minor',
        'tax_minor',
        'total_minor',
        'estimated_duration_minutes',
        'customer_message',
        'internal_notes',
        'valid_until',
        'public_token',
        'public_token_hash',
        'status',
        'sent_at',
        'accepted_at',
        'rejected_at',
        'cancelled_at',
        'expired_at',
        'converted_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'subtotal_minor' => 'integer',
        'tax_minor' => 'integer',
        'total_minor' => 'integer',
        'estimated_duration_minutes' => 'integer',
        'valid_until' => 'datetime',
        'sent_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'expired_at' => 'datetime',
        'converted_at' => 'datetime',
    ];

    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function setPublicTokenAttribute(?string $value): void
    {
        $this->plainPublicToken = $value;
        $this->attributes['public_token_hash'] = $value === null
            ? null
            : self::hashToken($value);
    }

    public function getPublicTokenAttribute(): ?string
    {
        return $this->plainPublicToken;
    }

    public function shouldExpire(): bool
    {
        return $this->status === self::STATUS_SENT
            && $this->valid_until !== null
            && $this->valid_until->isPast();
    }

    public function expireIfNeeded(): self
    {
        if (! $this->shouldExpire()) {
            return $this;
        }

        $expiredAt = $this->expired_at ?? now();

        $this->forceFill([
            'status' => self::STATUS_EXPIRED,
            'expired_at' => $expiredAt,
        ])->save();

        if ($this->relationLoaded('request') && $this->request) {
            $this->request->update([
                'last_activity_at' => now(),
            ]);
        } else {
            $this->request()->update([
                'last_activity_at' => now(),
            ]);
        }

        return $this;
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(QuoteRequest::class, 'quote_request_id');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(QuoteLineItem::class, 'quote_id');
    }

    public function convertedBooking(): HasOne
    {
        return $this->hasOne(Booking::class, 'source_quote_id');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }
}
