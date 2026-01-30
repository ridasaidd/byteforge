<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ThemePlaceholder Model
 *
 * Represents placeholder content for theme sections (header, footer, sidebar, etc.)
 * These are template/blueprint pieces that get copied to theme_parts when a theme is activated.
 *
 * Separation of Concerns:
 * - ThemePlaceholder: Blueprint content (created in Theme Builder)
 * - ThemePart: Live instance content (created on theme activation, edited in Customize mode)
 *
 * This prevents contamination where editing customize mode would affect the original template.
 */
class ThemePlaceholder extends Model
{
    use HasFactory;

    protected $fillable = [
        'theme_id',
        'type',
        'content',
    ];

    protected $casts = [
        'content' => 'array',
    ];

    /**
     * Relationship: ThemePlaceholder belongs to a Theme (blueprint)
     */
    public function theme(): BelongsTo
    {
        return $this->belongsTo(Theme::class);
    }

    /**
     * Scope: Get placeholders by type
     * Useful for loading all headers, footers, sidebars, etc.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Get placeholder types used across all themes
     * Useful for UI to show which types are available
     */
    public static function getAllTypes(): array
    {
        return self::distinct('type')->pluck('type')->toArray();
    }
}
