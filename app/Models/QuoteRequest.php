<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class QuoteRequest extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    public const STATUS_SUBMITTED = 'submitted';
    public const ORIGIN_PUBLIC = 'public';
    public const ORIGIN_MANUAL = 'manual';
    public const ATTACHMENTS_COLLECTION = 'attachments';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id',
        'requested_booking_service_id',
        'guest_user_id',
        'origin_surface',
        'guest_name',
        'guest_email',
        'guest_phone',
        'subject_label',
        'request_description',
        'preferred_start_at',
        'preferred_end_at',
        'status',
        'submitted_at',
        'reviewed_at',
        'last_activity_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'preferred_start_at' => 'datetime',
        'preferred_end_at' => 'datetime',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    public function bookingService(): BelongsTo
    {
        return $this->belongsTo(BookingService::class, 'requested_booking_service_id');
    }

    public function guestUser(): BelongsTo
    {
        return $this->belongsTo(GuestUser::class, 'guest_user_id');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class, 'quote_request_id');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::ATTACHMENTS_COLLECTION)
            ->useDisk('private-media')
            ->acceptsMimeTypes([
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'video/mp4',
                'video/mpeg',
                'video/quicktime',
                'video/x-msvideo',
                'video/webm',
            ]);
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeForGuest(Builder $query, int $guestUserId): Builder
    {
        return $query->where('guest_user_id', $guestUserId);
    }
}
