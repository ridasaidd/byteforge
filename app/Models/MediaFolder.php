<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media as BaseMedia;

class MediaFolder extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'path',
        'parent_id',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($folder) {
            if (empty($folder->slug)) {
                $folder->slug = Str::slug($folder->name);
            }

            // Auto-generate path based on parent
            if ($folder->parent_id) {
                $parent = static::find($folder->parent_id);
                $folder->path = $parent->path . '/' . $folder->slug;
            } else {
                $folder->path = '/' . $folder->slug;
            }
        });

        static::updating(function ($folder) {
            // Update path if name changed
            if ($folder->isDirty('name')) {
                $folder->slug = Str::slug($folder->name);

                if ($folder->parent_id) {
                    $parent = static::find($folder->parent_id);
                    $folder->path = $parent->path . '/' . $folder->slug;
                } else {
                    $folder->path = '/' . $folder->slug;
                }

                // Update all child paths
                $folder->updateChildrenPaths();
            }
        });
    }

    /**
     * Get the parent folder.
     */
    public function parent()
    {
        return $this->belongsTo(MediaFolder::class, 'parent_id');
    }

    /**
     * Get all child folders.
     */
    public function children()
    {
        return $this->hasMany(MediaFolder::class, 'parent_id')->orderBy('name');
    }

    /**
     * Get all media in this folder.
     */
    public function media()
    {
        return $this->hasMany(Media::class, 'folder_id')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Get media count.
     */
    public function getMediaCountAttribute()
    {
        return $this->media()->count();
    }

    /**
     * Update paths for all children recursively.
     */
    protected function updateChildrenPaths()
    {
        foreach ($this->children as $child) {
            $child->path = $this->path . '/' . $child->slug;
            $child->saveQuietly(); // Prevent infinite loop
            $child->updateChildrenPaths();
        }
    }

    /**
     * Scope to tenant.
     */
    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to root folders (no parent).
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }
}
