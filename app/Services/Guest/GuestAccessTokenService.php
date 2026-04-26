<?php

declare(strict_types=1);

namespace App\Services\Guest;

use App\Models\GuestUser;
use App\Models\WebRefreshSession;
use Illuminate\Support\Str;
use JsonException;

class GuestAccessTokenService
{
    public function issue(GuestUser $guestUser, string $tenantId, WebRefreshSession $session): string
    {
        $issuedAt = now();
        $payload = [
            'sub' => $guestUser->id,
            'type' => 'guest',
            'tenant_id' => $tenantId,
            'sid' => $session->id,
            'iat' => $issuedAt->timestamp,
            'exp' => $issuedAt->copy()->addMinutes($this->ttlMinutes())->timestamp,
        ];

        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = $this->sign($encodedPayload);

        return $encodedPayload.'.'.$signature;
    }

    /**
     * @return array{guest_user_id: int, session_id: int, tenant_id: string, issued_at: int, expires_at: int}|null
     */
    public function verify(string $token, string $tenantId): ?array
    {
        $parts = explode('.', $token, 2);

        if (count($parts) !== 2) {
            return null;
        }

        [$encodedPayload, $providedSignature] = $parts;
        $expectedSignature = $this->sign($encodedPayload);

        if (! hash_equals($expectedSignature, $providedSignature)) {
            return null;
        }

        try {
            $decodedPayload = $this->base64UrlDecode($encodedPayload);
            $payload = json_decode($decodedPayload, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        if (! is_array($payload)) {
            return null;
        }

        $guestUserId = filter_var($payload['sub'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $sessionId = filter_var($payload['sid'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $issuedAt = filter_var($payload['iat'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $expiresAt = filter_var($payload['exp'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $payloadTenantId = $payload['tenant_id'] ?? null;

        if (($payload['type'] ?? null) !== 'guest') {
            return null;
        }

        if (! is_string($payloadTenantId) || $payloadTenantId !== $tenantId) {
            return null;
        }

        if ($guestUserId === false || $sessionId === false || $issuedAt === false || $expiresAt === false) {
            return null;
        }

        if ($expiresAt < now()->timestamp) {
            return null;
        }

        return [
            'guest_user_id' => $guestUserId,
            'session_id' => $sessionId,
            'tenant_id' => $payloadTenantId,
            'issued_at' => $issuedAt,
            'expires_at' => $expiresAt,
        ];
    }

    private function ttlMinutes(): int
    {
        return (int) config('guest_auth.access_token_ttl_minutes', 15);
    }

    private function sign(string $encodedPayload): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $encodedPayload, $this->signingKey(), true));
    }

    private function signingKey(): string
    {
        $key = (string) config('app.key', '');

        if (Str::startsWith($key, 'base64:')) {
            $decoded = base64_decode(Str::after($key, 'base64:'), true);

            return $decoded !== false ? $decoded : Str::after($key, 'base64:');
        }

        return $key;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $padding = strlen($value) % 4;

        if ($padding !== 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? '' : $decoded;
    }
}
