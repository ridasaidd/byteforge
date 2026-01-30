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
        'is_system_theme',
        'description',
        'preview_image',
        'author',
        'version',
        'custom_css',
        'settings_css',
        'header_css',
        'footer_css',
    ];

    protected $casts = [
        'theme_data' => 'array',
        'is_active' => 'boolean',
        'is_system_theme' => 'boolean',
    ];

    protected $appends = [
        'css_url',
        'css_version',
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
     * Get the placeholder content for this theme (blueprint placeholders).
     * Only relevant for system themes (is_system_theme = true, tenant_id = NULL).
     */
    public function placeholders()
    {
        return $this->hasMany(ThemePlaceholder::class);
    }

    /**
     * Get the theme parts associated with this theme.
     * Note: For instances (tenant_id set), theme_id is NULL.
     * For old blueprint data still in theme_parts, theme_id is set.
     */
    public function parts()
    {
        return $this->hasMany(ThemePart::class);
    }

    /**
     * Get the page templates associated with this theme.
     */
    public function pageTemplates()
    {
        return $this->hasMany(PageTemplate::class);
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
     * Activate this theme and deactivate others for the same scope.
     * For central (null), deactivates other themes with tenant_id = null.
     * For tenants, deactivates other themes for that tenant.
     *
     * Note: In simplified architecture, themes are global blueprints.
     * The tenant_id parameter controls which scope is being activated.
     */
    public function activate(?string $tenantId = null): bool
    {
        // Deactivate all other themes for this scope
        static::forTenant($tenantId)
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
     * Get the public URL for this theme's generated CSS file.
     * Includes cache-busting version parameter.
     *
     * @return string
     */
    public function getCssUrl(): string
    {
        $version = $this->getCssVersion();
        return "/storage/themes/{$this->id}/{$this->id}.css?v={$version}";
    }

    /**
     * Get the version string for cache-busting (based on updated_at timestamp).
     *
     * @return string
     */
    public function getCssVersion(): string
    {
        return (string) $this->updated_at->timestamp;
    }

    /**
     * Accessor for css_url attribute (for JSON serialization).
     *
     * @return string
     */
    public function getCssUrlAttribute(): string
    {
        return $this->getCssUrl();
    }

    /**
     * Accessor for css_version attribute (for JSON serialization).
     *
     * @return string
     */
    public function getCssVersionAttribute(): string
    {
        return $this->getCssVersion();
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
