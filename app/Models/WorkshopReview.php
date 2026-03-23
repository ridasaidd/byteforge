<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkshopReview extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'workshop_profile_id',
        'reviewer_user_id',
        'rating',
        'comment',
        'is_verified',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'rating' => 'integer',
        'is_verified' => 'boolean',
    ];

    public function workshopProfile(): BelongsTo
    {
        return $this->belongsTo(WorkshopProfile::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    /**
     * Recalculate parent workshop rating after every save or delete.
     */
    protected static function booted(): void
    {
        static::saved(function (WorkshopReview $review): void {
            $review->workshopProfile->recalculateRating();
        });

        static::deleted(function (WorkshopReview $review): void {
            $review->workshopProfile->recalculateRating();
        });
    }
}
