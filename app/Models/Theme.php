<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogsActivity;
use Spatie\Activitylog\Traits\LogsActivity as LogsActivityTrait;

class Theme extends Model
{
    use HasFactory, LogsActivityTrait;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'base_theme',
        'theme_data',
        'is_active',
        'description',
        'author',
        'version',
    ];

    protected $casts = [
        'theme_data' => 'array',
        'is_active' => 'boolean',
    ];

    public function getActivitylogOptions(): \Spatie\Activitylog\LogOptions
    {
        return \Spatie\Activitylog\LogOptions::defaults()
            ->logOnly(['name', 'slug', 'is_active'])
            ->logOnlyDirty();
    }

    /**
     * Get the tenant that owns the theme.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope a query to only include active themes.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query for a specific tenant.
     */
    public function scopeForTenant($query, $tenantId)
    {
        if ($tenantId === null || $tenantId === 'null' || $tenantId === '') {
            return $query->whereNull('tenant_id');
        }
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Activate this theme and deactivate others for the same tenant.
     */
    public function activate(): bool
    {
        // Deactivate all other themes for this tenant
        static::forTenant($this->tenant_id)
            ->where('id', '!=', $this->id)
            ->update(['is_active' => false]);

        // Activate this theme
        $this->is_active = true;
        return $this->save();
    }

    /**
     * Resolve a theme value using dot notation.
     * Example: resolve('colors.primary.600') returns '#2563eb'
     */
    public function resolve(string $path, $default = null)
    {
        $keys = explode('.', $path);
        $value = $this->theme_data;

        foreach ($keys as $key) {
            if (!is_array($value) || !array_key_exists($key, $value)) {
                return $default;
            }
            $value = $value[$key];
        }

        // If value is a reference (e.g., "colors.primary.600"), resolve it recursively
        if (is_string($value) && strpos($value, '.') !== false && !$this->isActualValue($value)) {
            return $this->resolve($value, $default);
        }

        return $value;
    }

    /**
     * Check if a string is an actual value (not a reference).
     */
    private function isActualValue(string $value): bool
    {
        // Check if it's a color (hex), size (with units), or other actual value
        return preg_match('/^#[0-9a-fA-F]{3,8}$/', $value) // Hex color
            || preg_match('/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/', $value) // Size with unit
            || in_array($value, ['transparent', 'none', 'inherit', 'auto', 'initial', 'unset']);
    }

    /**
     * Reset theme to base theme values.
     */
    public function resetToBase(): bool
    {
        if (!$this->base_theme) {
            return false;
        }

        $baseThemePath = resource_path("js/shared/themes/{$this->base_theme}/theme.json");

        if (!file_exists($baseThemePath)) {
            return false;
        }

        $baseThemeData = json_decode(file_get_contents($baseThemePath), true);
        $this->theme_data = $baseThemeData;

        return $this->save();
    }

    /**
     * Check if theme has been customized from base.
     */
    public function isCustomized(): bool
    {
        if (!$this->base_theme) {
            return false;
        }

        $baseThemePath = resource_path("shared/themes/{$this->base_theme}/theme.json");

        if (!file_exists($baseThemePath)) {
            return false;
        }

        $baseThemeData = json_decode(file_get_contents($baseThemePath), true);

        return $this->theme_data !== $baseThemeData;
    }
}
