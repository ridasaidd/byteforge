<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ThemePart extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'tenant_id',
        'theme_id',
        'name',
        'slug',
        'type',
        'puck_data_raw',
        'puck_data_compiled',
        'status',
        'sort_order',
        'created_by',
    ];

    protected $casts = [
        'puck_data_raw' => 'array',
        'puck_data_compiled' => 'array',
        'sort_order' => 'integer',
    ];

    /**
     * Get the tenant that owns the theme part.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    /**
     * Get the user who created the theme part.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the theme this part belongs to.
     */
    public function theme()
    {
        return $this->belongsTo(Theme::class);
    }

    /**
     * Get layouts using this part as header.
     */
    public function layoutsAsHeader()
    {
        return $this->hasMany(Layout::class, 'header_id');
    }

    /**
     * Get layouts using this part as footer.
     */
    public function layoutsAsFooter()
    {
        return $this->hasMany(Layout::class, 'footer_id');
    }

    /**
     * Get pages directly using this part as header.
     */
    public function pagesAsHeader()
    {
        return $this->hasMany(Page::class, 'header_id');
    }

    /**
     * Get pages directly using this part as footer.
     */
    public function pagesAsFooter()
    {
        return $this->hasMany(Page::class, 'footer_id');
    }

    /**
     * Configure activity logging.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug', 'type', 'status'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('theme_parts')
            ->setDescriptionForEvent(fn (string $eventName) => "Theme part {$eventName}");
    }
}
