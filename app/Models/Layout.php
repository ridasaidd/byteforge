<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Layout extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'header_id',
        'footer_id',
        'sidebar_left_id',
        'sidebar_right_id',
        'status',
    ];

    protected $casts = [
        'header_id' => 'integer',
        'footer_id' => 'integer',
        'sidebar_left_id' => 'integer',
        'sidebar_right_id' => 'integer',
    ];

    /**
     * Get the tenant that owns the layout.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    /**
     * Get the header theme part.
     */
    public function header()
    {
        return $this->belongsTo(ThemePart::class, 'header_id');
    }

    /**
     * Get the footer theme part.
     */
    public function footer()
    {
        return $this->belongsTo(ThemePart::class, 'footer_id');
    }

    /**
     * Get the left sidebar theme part.
     */
    public function sidebarLeft()
    {
        return $this->belongsTo(ThemePart::class, 'sidebar_left_id');
    }

    /**
     * Get the right sidebar theme part.
     */
    public function sidebarRight()
    {
        return $this->belongsTo(ThemePart::class, 'sidebar_right_id');
    }

    /**
     * Get pages using this layout.
     */
    public function pages()
    {
        return $this->hasMany(Page::class, 'layout_id');
    }

    /**
     * Configure activity logging.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'slug', 'status'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('layouts')
            ->setDescriptionForEvent(fn (string $eventName) => "Layout {$eventName}");
    }
}
