<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Quotes;

use App\Http\Controllers\Controller;
use App\Models\GuestUser;
use App\Models\Quote;
use App\Models\QuoteLineItem;
use App\Services\QuoteWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestQuoteController extends Controller
{
    public function __construct(
        private readonly QuoteWorkflowService $quoteWorkflow,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $guestUser = $this->authenticatedGuest($request);

        $quotes = Quote::query()
            ->forTenant($this->currentTenantId())
            ->where('status', '!=', Quote::STATUS_DRAFT)
            ->whereHas('request', fn ($query) => $query->forGuest($guestUser->id))
            ->with(['lineItems', 'request.bookingService:id,name', 'convertedBooking:id,source_quote_id,status,starts_at,ends_at'])
            ->orderByDesc('sent_at')
            ->orderByDesc('created_at')
            ->get();

        $rows = $quotes->map(function (Quote $quote): array {
            $wasSent = $quote->status === Quote::STATUS_SENT;
            $quote->expireIfNeeded();

            if ($wasSent && $quote->status === Quote::STATUS_EXPIRED) {
                $this->quoteWorkflow->handleExpired($quote);
            }

            return $this->quotePayload($quote->fresh(['lineItems', 'request.bookingService:id,name', 'convertedBooking:id,source_quote_id,status,starts_at,ends_at']));
        })->all();

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $quote = $this->resolveGuestQuote($request, $id, [
            Quote::STATUS_SENT,
            Quote::STATUS_ACCEPTED,
            Quote::STATUS_REJECTED,
            Quote::STATUS_CANCELLED,
            Quote::STATUS_EXPIRED,
            Quote::STATUS_CONVERTED,
        ]);

        return response()->json([
            'data' => $this->quotePayload($quote),
        ]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $quote = $this->resolveGuestQuote($request, $id, [Quote::STATUS_SENT, Quote::STATUS_ACCEPTED, Quote::STATUS_EXPIRED]);

        if ($quote->status === Quote::STATUS_EXPIRED) {
            return response()->json([
                'message' => 'This quote has expired.',
            ], 422);
        }

        if ($quote->status === Quote::STATUS_ACCEPTED) {
            return response()->json([
                'data' => $this->quotePayload($quote),
            ]);
        }

        $quote->update([
            'status' => Quote::STATUS_ACCEPTED,
            'accepted_at' => now(),
        ]);

        $quote->request?->update([
            'last_activity_at' => now(),
        ]);

        $quote = $quote->fresh(['lineItems', 'request.bookingService:id,name', 'convertedBooking:id,source_quote_id,status,starts_at,ends_at']);
        $this->quoteWorkflow->handleAccepted($quote);

        return response()->json([
            'data' => $this->quotePayload($quote),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $quote = $this->resolveGuestQuote($request, $id, [Quote::STATUS_SENT, Quote::STATUS_REJECTED, Quote::STATUS_EXPIRED]);

        if ($quote->status === Quote::STATUS_EXPIRED) {
            return response()->json([
                'message' => 'This quote has expired.',
            ], 422);
        }

        if ($quote->status === Quote::STATUS_REJECTED) {
            return response()->json([
                'data' => $this->quotePayload($quote),
            ]);
        }

        $quote->update([
            'status' => Quote::STATUS_REJECTED,
            'rejected_at' => now(),
        ]);

        $quote->request?->update([
            'last_activity_at' => now(),
        ]);

        $quote = $quote->fresh(['lineItems', 'request.bookingService:id,name', 'convertedBooking:id,source_quote_id,status,starts_at,ends_at']);
        $this->quoteWorkflow->handleRejected($quote);

        return response()->json([
            'data' => $this->quotePayload($quote),
        ]);
    }

    /**
     * @param  list<string>  $allowedStatuses
     */
    private function resolveGuestQuote(Request $request, int $id, array $allowedStatuses): Quote
    {
        $guestUser = $this->authenticatedGuest($request);

        $quote = Quote::query()
            ->forTenant($this->currentTenantId())
            ->where('status', '!=', Quote::STATUS_DRAFT)
            ->whereKey($id)
            ->whereHas('request', fn ($query) => $query->forGuest($guestUser->id))
            ->with(['lineItems', 'request.bookingService:id,name', 'convertedBooking:id,source_quote_id,status,starts_at,ends_at'])
            ->firstOrFail();

        $wasSent = $quote->status === Quote::STATUS_SENT;
        $quote->expireIfNeeded();

        if ($wasSent && $quote->status === Quote::STATUS_EXPIRED) {
            $this->quoteWorkflow->handleExpired($quote);
        }

        if (! in_array($quote->status, $allowedStatuses, true)) {
            abort(404);
        }

        return $quote->fresh(['lineItems', 'request.bookingService:id,name', 'convertedBooking:id,source_quote_id,status,starts_at,ends_at']);
    }

    private function authenticatedGuest(Request $request): GuestUser
    {
        $guestUser = $request->attributes->get('guest_user');

        if (! $guestUser instanceof GuestUser) {
            abort(401, 'Unauthenticated.');
        }

        return $guestUser;
    }

    private function currentTenantId(): string
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            abort(403, 'Tenant context is required.');
        }

        return (string) tenancy()->tenant->id;
    }

    /**
     * @return array<string, mixed>
     */
    private function quotePayload(Quote $quote): array
    {
        $request = $quote->request;
        $convertedBooking = $quote->convertedBooking;

        return [
            'id' => $quote->id,
            'request_id' => $quote->quote_request_id,
            'status' => $quote->status,
            'currency' => $quote->currency,
            'subtotal_minor' => $quote->subtotal_minor,
            'tax_minor' => $quote->tax_minor,
            'total_minor' => $quote->total_minor,
            'estimated_duration_minutes' => $quote->estimated_duration_minutes,
            'customer_message' => $quote->customer_message,
            'valid_until' => $quote->valid_until?->toIso8601String(),
            'sent_at' => $quote->sent_at?->toIso8601String(),
            'accepted_at' => $quote->accepted_at?->toIso8601String(),
            'rejected_at' => $quote->rejected_at?->toIso8601String(),
            'cancelled_at' => $quote->cancelled_at?->toIso8601String(),
            'expired_at' => $quote->expired_at?->toIso8601String(),
            'converted_at' => $quote->converted_at?->toIso8601String(),
            'subject_label' => $request?->subject_label,
            'request_description' => $request?->request_description,
            'preferred_start_at' => $request?->preferred_start_at?->toIso8601String(),
            'preferred_end_at' => $request?->preferred_end_at?->toIso8601String(),
            'booking_service' => $request?->bookingService ? [
                'id' => $request->bookingService->id,
                'name' => $request->bookingService->name,
            ] : null,
            'line_items' => $quote->lineItems->map(fn (QuoteLineItem $item) => [
                'id' => $item->id,
                'label' => $item->label,
                'description' => $item->description,
                'quantity' => (float) $item->quantity,
                'unit_price_minor' => $item->unit_price_minor,
                'line_total_minor' => $item->line_total_minor,
            ])->values()->all(),
            'converted_booking' => $convertedBooking ? [
                'id' => $convertedBooking->id,
                'status' => $convertedBooking->status,
                'starts_at' => $convertedBooking->starts_at?->toIso8601String(),
                'ends_at' => $convertedBooking->ends_at?->toIso8601String(),
            ] : null,
        ];
    }
}