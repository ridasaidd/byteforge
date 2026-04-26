<?php

declare(strict_types=1);

namespace App\Services\Guest;

use App\Models\Booking;
use App\Models\GuestUser;

class BookingGuestLinkingService
{
    public function linkByEmail(GuestUser $guestUser, string $tenantId): int
    {
        return Booking::query()
            ->where('tenant_id', $tenantId)
            ->whereNull('guest_user_id')
            ->whereRaw('LOWER(customer_email) = ?', [mb_strtolower($guestUser->email)])
            ->update([
                'guest_user_id' => $guestUser->id,
                'updated_at' => now(),
            ]);
    }

    public function guestUserIdForCustomerEmail(?GuestUser $guestUser, string $customerEmail): ?int
    {
        if (! $guestUser instanceof GuestUser) {
            return null;
        }

        if (mb_strtolower($guestUser->email) !== mb_strtolower($customerEmail)) {
            return null;
        }

        return $guestUser->id;
    }
}
