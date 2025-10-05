<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;

class MediaLibrary extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    protected $fillable = [
        'tenant_id',
        'folder_id',
        'name',
        'description',
        'uploaded_by',
    ];

    protected $casts = [
        'uploaded_by' => 'integer',
    ];

    /**
     * Get the tenant that owns the media library entry.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the folder this media belongs to.
     */
    public function folder()
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }

    /**
     * Get the user who uploaded the media.
     */
    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Register media collections with conversions for images.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('default');

        // Images collection with strict validation and conversions
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

        // Documents collection
        $this->addMediaCollection('documents')
            ->acceptsMimeTypes([
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
            ]);

        // Videos collection
        $this->addMediaCollection('videos')
            ->acceptsMimeTypes([
                'video/mp4',
                'video/mpeg',
                'video/quicktime',
                'video/x-msvideo',
                'video/webm',
            ]);
    }
}
