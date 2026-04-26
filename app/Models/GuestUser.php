<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;

class GuestUser extends Model
{
    use HasFactory;
    use Notifiable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'name',
        'email_verified_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function magicLinkTokens(): HasMany
    {
        return $this->hasMany(GuestMagicLinkToken::class);
    }

    public function webRefreshSessions(): HasMany
    {
        return $this->hasMany(WebRefreshSession::class);
    }

    public function routeNotificationForMail(): string
    {
        return $this->email;
    }
}
