<?php

declare(strict_types=1);

namespace App\Services\Guest;

use App\Models\GuestMagicLinkToken;
use App\Models\GuestUser;
use App\Models\Tenant;
use App\Notifications\Guest\GuestMagicLinkNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GuestMagicLinkService
{
    /**
     * @return array{guestUser: GuestUser, token: GuestMagicLinkToken, plainToken: string, tenant: Tenant}
     */
    public function issue(string $email, string $tenantId, string $redirectUrl): array
    {
        $tenant = Tenant::query()->findOrFail($tenantId);
        $plainToken = Str::random(80);
        $expiresAt = $this->expiresAt();

        [$guestUser, $token] = DB::transaction(function () use ($email, $tenantId, $plainToken, $expiresAt): array {
            $guestUser = GuestUser::query()->firstOrCreate(
                ['email' => $email],
                ['name' => null]
            );

            GuestMagicLinkToken::query()
                ->where('guest_user_id', $guestUser->id)
                ->where('tenant_id', $tenantId)
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->update(['used_at' => now()]);

            $token = GuestMagicLinkToken::query()->create([
                'guest_user_id' => $guestUser->id,
                'tenant_id' => $tenantId,
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => $expiresAt,
            ]);

            return [$guestUser, $token];
        });

        $guestUser->notify(new GuestMagicLinkNotification(
            $tenant,
            $this->magicLink($redirectUrl, $plainToken),
            $this->ttlMinutes(),
        ));

        return [
            'guestUser' => $guestUser,
            'token' => $token,
            'plainToken' => $plainToken,
            'tenant' => $tenant,
        ];
    }

    public function verify(string $plainToken, string $tenantId): GuestUser
    {
        return DB::transaction(function () use ($plainToken, $tenantId): GuestUser {
            $token = GuestMagicLinkToken::query()
                ->where('token_hash', hash('sha256', $plainToken))
                ->lockForUpdate()
                ->first();

            if (! $token instanceof GuestMagicLinkToken) {
                throw $this->invalidTokenException();
            }

            if ($token->tenant_id !== $tenantId || $token->used_at !== null || $token->expires_at->isPast()) {
                throw $this->invalidTokenException();
            }

            $token->forceFill([
                'used_at' => now(),
            ])->save();

            $guestUser = $token->guestUser;

            if (! $guestUser instanceof GuestUser) {
                throw $this->invalidTokenException();
            }

            if ($guestUser->email_verified_at === null) {
                $guestUser->forceFill([
                    'email_verified_at' => now(),
                ])->save();
            }

            return $guestUser->fresh();
        });
    }

    private function invalidTokenException(): ValidationException
    {
        return ValidationException::withMessages([
            'token' => ['Invalid or expired magic link.'],
        ]);
    }

    private function magicLink(string $redirectUrl, string $plainToken): string
    {
        return rtrim($redirectUrl, '/').'/'.$plainToken;
    }

    private function expiresAt(): Carbon
    {
        return now()->addMinutes($this->ttlMinutes());
    }

    private function ttlMinutes(): int
    {
        return (int) config('guest_auth.magic_link_ttl_minutes', 30);
    }
}
