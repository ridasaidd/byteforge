<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Quotes;

use App\Actions\Api\SanitizeQuoteRequestInputAction;
use App\Http\Controllers\Controller;
use App\Models\BookingService;
use App\Models\Quote;
use App\Models\QuoteLineItem;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Services\Guest\GuestSessionResolver;
use App\Services\Guest\QuoteGuestLinkingService;
use App\Services\QuoteWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;

class PublicQuoteRequestController extends Controller
{
    public function __construct(
        private readonly SanitizeQuoteRequestInputAction $sanitizeQuoteRequestInput,
        private readonly GuestSessionResolver $guestSessionResolver,
        private readonly QuoteGuestLinkingService $quoteGuestLinkingService,
        private readonly QuoteWorkflowService $quoteWorkflow,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant();
        $tenantId = (string) $tenant->id;

        $validated = Validator::make(
            ($this->sanitizeQuoteRequestInput)($request->all()),
            [
                'requested_booking_service_id' => ['nullable', 'integer', 'exists:booking_services,id'],
                'guest_name' => ['required', 'string', 'max:120'],
                'guest_email' => ['required', 'email:rfc', 'max:255'],
                'guest_phone' => ['nullable', 'string', 'max:40'],
                'subject_label' => ['nullable', 'string', 'max:160'],
                'request_description' => ['required', 'string', 'max:5000'],
                'preferred_start_at' => ['nullable', 'date'],
                'preferred_end_at' => ['nullable', 'date', 'after_or_equal:preferred_start_at'],
                'attachments' => ['nullable', 'array', 'max:5'],
                'attachments.*' => [
                    'file',
                    'max:20480',
                    'mimes:jpg,jpeg,png,gif,webp,mp4,mpeg,mov,avi,webm',
                    'mimetypes:image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm',
                ],
            ]
        )->validate();

        $serviceId = null;
        if (isset($validated['requested_booking_service_id'])) {
            $serviceId = (int) BookingService::query()
                ->forTenant($tenantId)
                ->findOrFail((int) $validated['requested_booking_service_id'])
                ->id;
        }

        $guestSession = $this->guestSessionResolver->resolve($request);
        $guestUser = $guestSession['guestUser'] ?? null;

        $quoteRequest = QuoteRequest::query()->create([
            'tenant_id' => $tenantId,
            'requested_booking_service_id' => $serviceId,
            'guest_user_id' => $this->quoteGuestLinkingService->guestUserIdForCustomerEmail($guestUser, $validated['guest_email']),
            'origin_surface' => QuoteRequest::ORIGIN_PUBLIC,
            'guest_name' => $validated['guest_name'],
            'guest_email' => $validated['guest_email'],
            'guest_phone' => $validated['guest_phone'] ?? null,
            'subject_label' => $validated['subject_label'] ?? null,
            'request_description' => $validated['request_description'],
            'preferred_start_at' => $validated['preferred_start_at'] ?? null,
            'preferred_end_at' => $validated['preferred_end_at'] ?? null,
            'status' => QuoteRequest::STATUS_SUBMITTED,
            'submitted_at' => now(),
            'last_activity_at' => now(),
        ]);

        foreach ($request->file('attachments', []) as $attachment) {
            if (! $attachment instanceof UploadedFile) {
                continue;
            }

            $quoteRequest->addMedia($attachment)
                ->withCustomProperties([
                    'uploaded_by_guest' => true,
                    'guest_email' => $quoteRequest->guest_email,
                ])
                ->toMediaCollection(QuoteRequest::ATTACHMENTS_COLLECTION);
        }

        $this->quoteWorkflow->handleRequestSubmitted($quoteRequest);

        return response()->json([
            'data' => [
                'id' => $quoteRequest->id,
                'requested_booking_service_id' => $quoteRequest->requested_booking_service_id,
                'guest_name' => $quoteRequest->guest_name,
                'guest_email' => $quoteRequest->guest_email,
                'status' => $quoteRequest->status,
                'submitted_at' => $quoteRequest->submitted_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function show(string $token): JsonResponse
    {
        $quote = $this->resolvePublicQuote($token, [
            Quote::STATUS_SENT,
            Quote::STATUS_ACCEPTED,
            Quote::STATUS_REJECTED,
            Quote::STATUS_CANCELLED,
            Quote::STATUS_EXPIRED,
            Quote::STATUS_CONVERTED,
        ]);

        return response()->json([
            'data' => $this->publicQuotePayload($quote),
        ]);
    }

    public function accept(string $token): JsonResponse
    {
        $quote = $this->resolvePublicQuote($token, [Quote::STATUS_SENT, Quote::STATUS_ACCEPTED, Quote::STATUS_EXPIRED]);

        if ($quote->status === Quote::STATUS_EXPIRED) {
            return response()->json([
                'message' => 'This quote has expired.',
            ], 422);
        }

        if ($quote->status === Quote::STATUS_ACCEPTED) {
            return response()->json([
                'data' => $this->publicQuotePayload($quote),
            ]);
        }

        $quote->update([
            'status' => Quote::STATUS_ACCEPTED,
            'accepted_at' => now(),
        ]);

        $quote->request?->update([
            'last_activity_at' => now(),
        ]);

        $quote = $quote->fresh()->load(['lineItems', 'request']);
        $this->quoteWorkflow->handleAccepted($quote);

        return response()->json([
            'data' => $this->publicQuotePayload($quote),
        ]);
    }

    public function reject(string $token): JsonResponse
    {
        $quote = $this->resolvePublicQuote($token, [Quote::STATUS_SENT, Quote::STATUS_REJECTED, Quote::STATUS_EXPIRED]);

        if ($quote->status === Quote::STATUS_EXPIRED) {
            return response()->json([
                'message' => 'This quote has expired.',
            ], 422);
        }

        if ($quote->status === Quote::STATUS_REJECTED) {
            return response()->json([
                'data' => $this->publicQuotePayload($quote),
            ]);
        }

        $quote->update([
            'status' => Quote::STATUS_REJECTED,
            'rejected_at' => now(),
        ]);

        $quote->request?->update([
            'last_activity_at' => now(),
        ]);

        $quote = $quote->fresh()->load(['lineItems', 'request']);
        $this->quoteWorkflow->handleRejected($quote);

        return response()->json([
            'data' => $this->publicQuotePayload($quote),
        ]);
    }

    private function currentTenant(): Tenant
    {
        if (! tenancy()->initialized || ! tenancy()->tenant instanceof Tenant) {
            abort(403, 'Tenant context is required.');
        }

        return tenancy()->tenant;
    }

    /**
     * @param  list<string>  $allowedStatuses
     */
    private function resolvePublicQuote(string $token, array $allowedStatuses): Quote
    {
        $quote = Quote::query()
            ->forTenant((string) $this->currentTenant()->id)
            ->where('public_token_hash', Quote::hashToken($token))
            ->with(['lineItems', 'request'])
            ->first();

        $wasSent = $quote?->status === Quote::STATUS_SENT;
        $quote?->expireIfNeeded();

        if ($quote && $wasSent && $quote->status === Quote::STATUS_EXPIRED) {
            $this->quoteWorkflow->handleExpired($quote);
        }

        if ($quote === null || ! in_array($quote->status, $allowedStatuses, true)) {
            abort(404);
        }

        return $quote;
    }

    private function publicQuotePayload(Quote $quote): array
    {
        return [
            'id' => $quote->id,
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
            'line_items' => $quote->lineItems->map(fn (QuoteLineItem $item) => [
                'id' => $item->id,
                'label' => $item->label,
                'description' => $item->description,
                'quantity' => (float) $item->quantity,
                'unit_price_minor' => $item->unit_price_minor,
                'line_total_minor' => $item->line_total_minor,
            ])->values()->all(),
        ];
    }
}
