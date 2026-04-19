<?php

namespace App\Services;

use App\DataObjects\PaymentData;
use App\Models\AnalyticsEvent;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\TenantPaymentProvider;
use App\Notifications\Booking\BookingConfirmedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * BookingPaymentService
 *
 * Orchestrates payment integration for bookings.
 * - Determines if a booking requires payment based on service config + tenant provider setup
 * - Creates payment records and handles status transitions (awaiting_payment → confirmed)
 * - Handles refunds on booking cancellation
 * - Records analytics events for payment-related booking actions
 */
class BookingPaymentService
{
    public function __construct(
        private PaymentService $paymentService,
        private RefundService $refundService,
        private AnalyticsService $analyticsService,
    ) {
    }

    /**
     * Check if a booking requires payment processing.
     *
     * Conditions:
     * - Service must have requires_payment = true
     * - Service must have a price > 0
     * - Tenant must have payment providers configured
     *
     * @return bool
     */
    public function bookingRequiresPayment(Booking $booking): bool
    {
        // Load fresh service if not already loaded
        if (! $booking->relationLoaded('service')) {
            $booking->load('service');
        }

        $service = $booking->service;

        // Service must require payment
        if (! $service->requires_payment) {
            return false;
        }

        // Service must have a price
        if (! $service->price || $service->price <= 0) {
            return false;
        }

        // Tenant must have at least one active payment provider configured
        $hasProvider = TenantPaymentProvider::forTenant($booking->tenant_id)
            ->active()
            ->exists();

        return $hasProvider;
    }

    /**
     * Create a payment for a booking.
     *
     * Transitions booking from 'pending_hold' to 'awaiting_payment'.
     * Returns the created payment, or null if no payment is needed.
     *
     * @return Payment|null
     * @throws \Exception if payment creation fails
     */
    public function createPaymentForBooking(Booking $booking): ?Payment
    {
        // Don't create payment if not required
        if (! $this->bookingRequiresPayment($booking)) {
            return null;
        }

        try {
            return DB::transaction(function () use ($booking) {
                $lockedBooking = Booking::query()
                    ->whereKey($booking->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($lockedBooking->payment_id !== null) {
                    $existingPayment = Payment::query()
                        ->forTenant((string) $lockedBooking->tenant_id)
                        ->find($lockedBooking->payment_id);

                    if ($existingPayment instanceof Payment) {
                        return $existingPayment;
                    }
                }

                if ($lockedBooking->status === Booking::STATUS_AWAITING_PAYMENT) {
                    throw new ModelNotFoundException('Booking is awaiting payment but has no linked payment record.');
                }

                if ($lockedBooking->status !== Booking::STATUS_PENDING_HOLD) {
                    throw new \RuntimeException(
                        "Booking {$lockedBooking->id} cannot start payment from status {$lockedBooking->status}."
                    );
                }

                if (! $lockedBooking->relationLoaded('service')) {
                    $lockedBooking->load('service');
                }

                $service = $lockedBooking->service;

                $provider = TenantPaymentProvider::forTenant($lockedBooking->tenant_id)
                    ->active()
                    ->first();

                if (! $provider) {
                    throw new \Exception('No active payment provider configured for tenant');
                }

                $paymentData = new PaymentData(
                    amount: (int) ($service->price * 100),
                    currency: $service->currency,
                    description: "Booking: {$service->name} on {$lockedBooking->starts_at->format('Y-m-d')}",
                    customerName: $lockedBooking->customer_name,
                    customerEmail: $lockedBooking->customer_email,
                    metadata: [
                        'booking_id' => $lockedBooking->id,
                        'reference' => "booking:{$lockedBooking->id}",
                    ],
                );

                $paymentResult = $this->paymentService->processPayment(
                    (string) $lockedBooking->tenant_id,
                    (string) $provider->provider,
                    $paymentData,
                );

                if (! $paymentResult->success) {
                    Log::warning('Failed to create payment for booking', [
                        'booking_id' => $lockedBooking->id,
                        'error' => $paymentResult->errorMessage,
                    ]);

                    throw new \Exception("Payment creation failed: {$paymentResult->errorMessage}");
                }

                $payment = Payment::forTenant((string) $lockedBooking->tenant_id)
                    ->where('provider_transaction_id', $paymentResult->providerTransactionId)
                    ->firstOrFail();

                $lockedBooking->update([
                    'status' => Booking::STATUS_AWAITING_PAYMENT,
                    'payment_id' => $payment->id,
                    'hold_expires_at' => null,
                ]);

                $lockedBooking->recordEvent(
                    toStatus: Booking::STATUS_AWAITING_PAYMENT,
                    actorType: Booking::ACTOR_SYSTEM,
                    fromStatus: Booking::STATUS_PENDING_HOLD,
                    note: 'Payment initiated',
                );

                return $payment;
            });
        } catch (\Exception $e) {
            Log::error('Exception during payment creation for booking', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Confirm a booking when payment is received.
     *
     * Transitions booking from 'awaiting_payment' to 'confirmed'.
     * Called by webhook handlers after payment confirmation.
     *
     * @param int $bookingId
     * @return Booking
     * @throws \Exception if booking not found or in unexpected state
     */
    public function confirmBookingAfterPayment(int $bookingId, string $tenantId): Booking
    {
        $booking = Booking::forTenant($tenantId)
            ->where('id', $bookingId)
            ->firstOrFail();

        // Idempotent: duplicate webhook deliveries should not be treated as an error
        if ($booking->status === Booking::STATUS_CONFIRMED) {
            return $booking;
        }

        if ($booking->status !== Booking::STATUS_AWAITING_PAYMENT) {
            Log::warning('Booking is not in awaiting_payment status', [
                'booking_id' => $bookingId,
                'current_status' => $booking->status,
            ]);

            throw new \Exception("Booking {$bookingId} is not awaiting payment (current status: {$booking->status})");
        }

        // Load relationships for analytics
        if (! $booking->relationLoaded('service')) {
            $booking->load('service');
        }

        // Update booking status
        $booking->update(['status' => Booking::STATUS_CONFIRMED]);

        $booking->recordEvent(
            toStatus: Booking::STATUS_CONFIRMED,
            actorType: Booking::ACTOR_SYSTEM,
            fromStatus: Booking::STATUS_AWAITING_PAYMENT,
            note: 'Payment received',
        );

        // Record analytics event for payment received
        $this->analyticsService->record(
            AnalyticsEvent::TYPE_BOOKING_PAYMENT_RECEIVED,
            [
                'booking_id' => $booking->id,
                'service_name' => $booking->service->name,
                'payment_id' => $booking->payment_id,
                'amount' => $booking->service->price,
                'currency' => $booking->service->currency,
            ],
            tenantId: $booking->tenant_id,
            subject: $booking,
        );

        // Also record the booking confirmation event
        $this->analyticsService->record(
            AnalyticsEvent::TYPE_BOOKING_CONFIRMED,
            [
                'booking_id' => $booking->id,
                'service_name' => $booking->service->name,
                'payment_received' => true,
            ],
            tenantId: $booking->tenant_id,
            subject: $booking,
        );

        // Dispatch confirmation notification to customer
        try {
            $domain = $this->tenantDomain($booking->tenant_id);
            Notification::route('mail', [$booking->customer_email => $booking->customer_name])
                ->notify(new BookingConfirmedNotification($booking, $domain));
        } catch (\Exception $e) {
            Log::warning('Failed to send confirmation notification', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
            ]);
        }

        return $booking;
    }

    /**
     * Process refund when a paid booking is cancelled.
     *
     * If booking has an associated payment, initiates refund.
     * Called during booking cancellation flow.
     *
     * @param Booking $booking
     * @param string|null $reason Cancellation reason for refund note
     * @return bool True if refund was processed (or not needed), false if refund failed
     */
    public function refundBookingIfPaid(Booking $booking, ?string $reason = null): bool
    {
        // Reload fresh if needed
        if (! $booking->relationLoaded('payment')) {
            $booking->load('payment');
        }

        $payment = $booking->payment;

        // No payment to refund
        if (! $payment) {
            return true;
        }

        // Don't refund if payment is not in a refundable state
        if (! in_array($payment->status, [Payment::STATUS_COMPLETED, Payment::STATUS_PARTIALLY_REFUNDED])) {
            Log::info('Payment not in refundable state, skipping refund', [
                'booking_id' => $booking->id,
                'payment_id' => $payment->id,
                'payment_status' => $payment->status,
            ]);

            return true;
        }

        try {
            $refund = $this->refundService->processRefund(
                payment: $payment,
                amount: (int) $payment->amount,
                reason: $reason ?? "Booking {$booking->id} cancelled",
            );

            if ($refund->status !== 'completed') {
                Log::error('Refund processing failed for cancelled booking', [
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'refund_id' => $refund->id,
                    'refund_status' => $refund->status,
                ]);

                return false;
            }

            Log::info('Refund processed for cancelled booking', [
                'booking_id' => $booking->id,
                'refund_id' => $refund->id,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Exception during refund processing for cancelled booking', [
                'booking_id' => $booking->id,
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get the primary domain for a tenant (used for notification links).
     *
     * @param string $tenantId
     * @return string
     */
    private function tenantDomain(string $tenantId): string
    {
        $tenant = \App\Models\Tenant::find($tenantId);
        return $tenant?->domains()->first()?->domain ?? config('app.url');
    }
}
