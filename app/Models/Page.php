<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media as MediaModel;

class Page extends Model implements HasMedia
{
    use HasFactory, LogsActivity, InteractsWithMedia;

    protected $fillable = [
        'tenant_id',
        'title',
        'slug',
        'page_type',
        'puck_data',
        'meta_data',
        'status',
        'is_homepage',
        'sort_order',
        'created_by',
        'published_at',
    ];

    protected $casts = [
        'puck_data' => 'array',
        'meta_data' => 'array',
        'is_homepage' => 'boolean',
        'sort_order' => 'integer',
        'published_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns the page.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    /**
     * Get the user who created the page.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Configure activity logging.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'slug', 'page_type', 'status', 'is_homepage', 'published_at'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('pages')
            ->setDescriptionForEvent(fn(string $eventName) => "Page {$eventName}");
    }

    /**
     * Register media collections.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('featured-image')
            ->singleFile()
            ->useDisk('public');
        
        $this->addMediaCollection('gallery')
            ->useDisk('public');
        
        $this->addMediaCollection('attachments')
            ->useDisk('public');
    }
}

