<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SystemSurface extends Model
{
    use HasFactory;
    use LogsActivity;

    public const KEY_TENANT_LOGIN = 'tenant_login';

    public const KEY_REGISTER = 'register';

    public const KEY_FORGOT_PASSWORD = 'forgot_password';

    public const KEY_RESET_PASSWORD = 'reset_password';

    public const KEY_GUEST_PORTAL = 'guest_portal';

    public const TYPE_AUTH = 'auth';

    public const TYPE_GUEST_PORTAL = 'guest_portal';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'surface_key',
        'title',
        'route_path',
        'surface_type',
        'puck_data',
        'settings',
        'is_enabled',
        'sort_order',
        'published_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'puck_data' => 'array',
        'settings' => 'array',
        'is_enabled' => 'boolean',
        'sort_order' => 'integer',
        'published_at' => 'datetime',
    ];

    /**
     * @return list<string>
     */
    public static function defaultKeys(): array
    {
        return [
            self::KEY_TENANT_LOGIN,
            self::KEY_REGISTER,
            self::KEY_FORGOT_PASSWORD,
            self::KEY_RESET_PASSWORD,
            self::KEY_GUEST_PORTAL,
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id', 'id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['surface_key', 'title', 'surface_type', 'route_path', 'is_enabled', 'published_at'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('system_surfaces')
            ->setDescriptionForEvent(fn (string $eventName) => "System surface {$eventName}");
    }
}
