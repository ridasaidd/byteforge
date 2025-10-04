<?php

namespace App\Models;

use Database\Factories\MediaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;

class Media extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    protected $table = 'media_items';

    protected $fillable = [
        'tenant_id',
        'folder_id',
        'title',
        'alt_text',
        'description',
    ];

    /**
     * Register media collections.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->acceptsMimeTypes([
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml',
            ])
            ->registerMediaConversions(function (SpatieMedia $media = null) {
                $this
                    ->addMediaConversion('thumb')
                    ->width(150)
                    ->height(150)
                    ->sharpen(10)
                    ->nonQueued();

                $this
                    ->addMediaConversion('small')
                    ->width(300)
                    ->height(300)
                    ->sharpen(10)
                    ->nonQueued();

                $this
                    ->addMediaConversion('medium')
                    ->width(800)
                    ->height(800)
                    ->sharpen(10)
                    ->nonQueued();

                $this
                    ->addMediaConversion('large')
                    ->width(1920)
                    ->height(1920)
                    ->sharpen(10)
                    ->nonQueued();

                // WebP conversions for modern browsers
                $this
                    ->addMediaConversion('webp')
                    ->width(1920)
                    ->height(1920)
                    ->format('webp')
                    ->nonQueued();
            });
    }

    /**
     * Get the folder this media belongs to.
     */
    public function folder()
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }

    /**
     * Scope to tenant.
     */
    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to specific folder.
     */
    public function scopeInFolder($query, $folderId)
    {
        return $query->where('folder_id', $folderId);
    }

    /**
     * Scope to root (no folder).
     */
    public function scopeRootMedia($query)
    {
        return $query->whereNull('folder_id');
    }
}

