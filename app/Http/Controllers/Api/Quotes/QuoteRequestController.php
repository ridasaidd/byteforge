<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Quotes;

use App\Http\Controllers\Controller;
use App\Models\BookingService;
use App\Models\Media;
use App\Models\Quote;
use App\Models\QuoteLineItem;
use App\Models\QuoteRequest;
use App\Services\QuoteWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class QuoteRequestController extends Controller
{
    public function __construct(
        private readonly QuoteWorkflowService $quoteWorkflow,
    ) {}

    public function index(): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $rows = QuoteRequest::query()
            ->forTenant($tenantId)
            ->with('bookingService:id,name')
            ->orderByDesc('last_activity_at')
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn (QuoteRequest $request) => [
                'id' => $request->id,
                'requested_booking_service_id' => $request->requested_booking_service_id,
                'origin_surface' => $request->origin_surface,
                'guest_name' => $request->guest_name,
                'guest_email' => $request->guest_email,
                'guest_phone' => $request->guest_phone,
                'subject_label' => $request->subject_label,
                'request_description' => $request->request_description,
                'preferred_start_at' => $request->preferred_start_at?->toIso8601String(),
                'preferred_end_at' => $request->preferred_end_at?->toIso8601String(),
                'status' => $request->status,
                'submitted_at' => $request->submitted_at?->toIso8601String(),
                'last_activity_at' => $request->last_activity_at?->toIso8601String(),
                'booking_service' => $request->bookingService
                    ? ['id' => $request->bookingService->id, 'name' => $request->bookingService->name]
                    : null,
            ])
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $httpRequest): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $validated = Validator::make($httpRequest->all(), [
            'requested_booking_service_id' => ['nullable', 'integer'],
            'guest_name' => ['required', 'string', 'max:120'],
            'guest_email' => ['required', 'email:rfc', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:40'],
            'subject_label' => ['nullable', 'string', 'max:160'],
            'request_description' => ['required', 'string', 'max:5000'],
            'preferred_start_at' => ['nullable', 'date'],
            'preferred_end_at' => ['nullable', 'date', 'after_or_equal:preferred_start_at'],
        ])->validate();

        $serviceId = null;
        if (isset($validated['requested_booking_service_id'])) {
            $serviceId = (int) BookingService::query()
                ->forTenant($tenantId)
                ->findOrFail((int) $validated['requested_booking_service_id'])
                ->id;
        }

        $quoteRequest = QuoteRequest::query()->create([
            'tenant_id' => $tenantId,
            'requested_booking_service_id' => $serviceId,
            'origin_surface' => QuoteRequest::ORIGIN_MANUAL,
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

        $quoteRequest->load('bookingService:id,name');
        $this->quoteWorkflow->handleManualRequestCreated($quoteRequest, $httpRequest->user('api'));

        return response()->json([
            'data' => $this->mapRequest($quoteRequest),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $request = QuoteRequest::query()
            ->forTenant($tenantId)
            ->with([
                'bookingService:id,name',
                'quotes.lineItems',
                'quotes.convertedBooking:id,source_quote_id',
                'media' => fn ($query) => $query
                    ->where('collection_name', QuoteRequest::ATTACHMENTS_COLLECTION)
                    ->orderBy('id'),
            ])
            ->findOrFail($id);

        $request->quotes->each(function (Quote $quote): void {
            $wasSent = $quote->status === Quote::STATUS_SENT;
            $quote->expireIfNeeded();

            if ($wasSent && $quote->status === Quote::STATUS_EXPIRED) {
                $this->quoteWorkflow->handleExpired($quote);
            }
        });

        return response()->json([
            'data' => $this->mapRequest($request, true),
        ]);
    }

    public function downloadAttachment(int $id, int $attachmentId): BinaryFileResponse
    {
        $tenantId = (string) tenant('id');

        $quoteRequest = QuoteRequest::query()
            ->forTenant($tenantId)
            ->findOrFail($id);

        $attachment = $quoteRequest->media()
            ->where('collection_name', QuoteRequest::ATTACHMENTS_COLLECTION)
            ->findOrFail($attachmentId);

        if (! $attachment instanceof Media) {
            abort(404);
        }

        return response()->download(
            $attachment->getPath(),
            $attachment->file_name,
            ['Content-Type' => $attachment->mime_type ?? 'application/octet-stream']
        );
    }

    public function createQuote(Request $httpRequest, int $id): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $quoteRequest = QuoteRequest::query()
            ->forTenant($tenantId)
            ->with('quotes')
            ->findOrFail($id);

        $validated = Validator::make($httpRequest->all(), [
            'currency' => ['required', 'string', 'size:3'],
            'estimated_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:10080'],
            'customer_message' => ['nullable', 'string', 'max:5000'],
            'internal_notes' => ['nullable', 'string', 'max:5000'],
            'valid_until' => ['nullable', 'date'],
            'line_items' => ['required', 'array', 'min:1', 'max:50'],
            'line_items.*.label' => ['required', 'string', 'max:160'],
            'line_items.*.description' => ['nullable', 'string', 'max:5000'],
            'line_items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'line_items.*.unit_price_minor' => ['required', 'integer', 'min:0'],
        ])->validate();

        $quote = DB::transaction(function () use ($validated, $quoteRequest, $tenantId, $httpRequest) {
            $lineItems = collect($validated['line_items'])
                ->values()
                ->map(function (array $item, int $index): array {
                    $quantity = round((float) $item['quantity'], 2);
                    $unitPriceMinor = (int) $item['unit_price_minor'];
                    $lineTotalMinor = (int) round($quantity * $unitPriceMinor);

                    return [
                        'label' => $item['label'],
                        'description' => $item['description'] ?? null,
                        'quantity' => $quantity,
                        'unit_price_minor' => $unitPriceMinor,
                        'line_total_minor' => $lineTotalMinor,
                        'sort_order' => $index,
                    ];
                });

            $subtotalMinor = (int) $lineItems->sum('line_total_minor');
            $version = ((int) $quoteRequest->quotes->max('version')) + 1;

            $quote = Quote::query()->create([
                'tenant_id' => $tenantId,
                'quote_request_id' => $quoteRequest->id,
                'version' => $version,
                'booking_service_id' => $quoteRequest->requested_booking_service_id,
                'created_by_user_id' => (int) $httpRequest->user('api')->id,
                'currency' => strtoupper((string) $validated['currency']),
                'subtotal_minor' => $subtotalMinor,
                'tax_minor' => null,
                'total_minor' => $subtotalMinor,
                'estimated_duration_minutes' => $validated['estimated_duration_minutes'] ?? null,
                'customer_message' => $validated['customer_message'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'valid_until' => $validated['valid_until'] ?? null,
                'status' => Quote::STATUS_DRAFT,
            ]);

            $quote->lineItems()->createMany($lineItems->all());

            $this->markRequestQuoted($quoteRequest);

            return $quote->load('lineItems');
        });

        $this->quoteWorkflow->handleDraftCreated($quote, $httpRequest->user('api'));

        return response()->json([
            'data' => $this->mapQuote($quote),
        ], 201);
    }

    public function sendQuote(Request $httpRequest, int $id): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $quote = Quote::query()
            ->forTenant($tenantId)
            ->with(['lineItems', 'request'])
            ->findOrFail($id);

        if ($quote->status !== Quote::STATUS_DRAFT) {
            return response()->json([
                'message' => 'Only draft quotes can be sent.',
            ], 422);
        }

        $publicToken = Quote::generateToken();

        $quote->update([
            'public_token' => $publicToken,
            'status' => Quote::STATUS_SENT,
            'sent_by_user_id' => (int) $httpRequest->user('api')->id,
            'sent_at' => now(),
        ]);

        $quote->request?->update([
            'last_activity_at' => now(),
        ]);

        $quote->load(['lineItems', 'request']);
        $this->quoteWorkflow->handleSent($quote, $publicToken, $httpRequest->user('api'));

        return response()->json([
            'data' => $this->mapQuote($quote),
        ]);
    }

    public function cancelQuote(Request $httpRequest, int $id): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $quote = Quote::query()
            ->forTenant($tenantId)
            ->with(['lineItems', 'request'])
            ->findOrFail($id);

        $wasSent = $quote->status === Quote::STATUS_SENT;
        $quote->expireIfNeeded();

        if ($wasSent && $quote->status === Quote::STATUS_EXPIRED) {
            $this->quoteWorkflow->handleExpired($quote);
        }

        if ($quote->status !== Quote::STATUS_SENT) {
            return response()->json([
                'message' => 'Only sent quotes can be cancelled.',
            ], 422);
        }

        $quote->update([
            'status' => Quote::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        $quote->request?->update([
            'last_activity_at' => now(),
        ]);

        $quote = $quote->fresh()->load(['lineItems', 'request']);
        $this->quoteWorkflow->handleCancelled($quote, $httpRequest->user('api'));

        return response()->json([
            'data' => $this->mapQuote($quote),
        ]);
    }

    public function destroyQuote(Request $httpRequest, int $id): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $quote = Quote::query()
            ->forTenant($tenantId)
            ->with('request')
            ->findOrFail($id);

        if ($quote->status !== Quote::STATUS_DRAFT) {
            return response()->json([
                'message' => 'Only draft quotes can be deleted.',
            ], 422);
        }

        $quoteRequest = $quote->request;
        $this->quoteWorkflow->handleDeleted($quote, $httpRequest->user('api'));
        $quote->delete();

        if ($quoteRequest) {
            $this->syncRequestStatusAfterQuoteDeletion($quoteRequest);
        }

        return response()->json([], 204);
    }

    public function convertToBooking(int $id): JsonResponse
    {
        $tenantId = (string) tenant('id');

        $quote = Quote::query()
            ->forTenant($tenantId)
            ->with('request')
            ->findOrFail($id);

        $wasSent = $quote->status === Quote::STATUS_SENT;
        $quote->expireIfNeeded();

        if ($wasSent && $quote->status === Quote::STATUS_EXPIRED) {
            $this->quoteWorkflow->handleExpired($quote);
        }

        if ($quote->status !== Quote::STATUS_ACCEPTED) {
            return response()->json([
                'message' => 'Only accepted quotes can be converted to a booking.',
            ], 422);
        }

        $request = $quote->request;

        return response()->json([
            'data' => [
                'quote_id' => $quote->id,
                'service_id' => $quote->booking_service_id ?? $request?->requested_booking_service_id,
                'customer_name' => $request?->guest_name,
                'customer_email' => $request?->guest_email,
                'customer_phone' => $request?->guest_phone,
                'customer_notes' => $quote->customer_message ?? $request?->request_description,
                'internal_notes' => $quote->internal_notes,
            ],
        ]);
    }

    private function mapRequest(QuoteRequest $request, bool $withQuote = false): array
    {
        $latestQuote = $withQuote
            ? $request->quotes->sortByDesc('version')->first()
            : null;

        return [
            'id' => $request->id,
            'requested_booking_service_id' => $request->requested_booking_service_id,
            'origin_surface' => $request->origin_surface,
            'guest_name' => $request->guest_name,
            'guest_email' => $request->guest_email,
            'guest_phone' => $request->guest_phone,
            'subject_label' => $request->subject_label,
            'request_description' => $request->request_description,
            'preferred_start_at' => $request->preferred_start_at?->toIso8601String(),
            'preferred_end_at' => $request->preferred_end_at?->toIso8601String(),
            'status' => $request->status,
            'submitted_at' => $request->submitted_at?->toIso8601String(),
            'last_activity_at' => $request->last_activity_at?->toIso8601String(),
            'booking_service' => $request->bookingService
                ? ['id' => $request->bookingService->id, 'name' => $request->bookingService->name]
                : null,
            'attachments' => $request->relationLoaded('media')
                ? $request->media->map(fn (Media $media) => [
                    'id' => $media->id,
                    'file_name' => $media->file_name,
                    'name' => $media->name,
                    'mime_type' => $media->mime_type,
                    'size' => $media->size,
                    'download_url' => route('tenant.quotes.requests.attachments.download', [
                        'id' => $request->id,
                        'attachmentId' => $media->id,
                    ]),
                ])->values()->all()
                : [],
            'latest_quote' => $latestQuote ? $this->mapQuote($latestQuote) : null,
        ];
    }

    private function mapQuote(Quote $quote): array
    {
        return [
            'id' => $quote->id,
            'version' => $quote->version,
            'currency' => $quote->currency,
            'subtotal_minor' => $quote->subtotal_minor,
            'tax_minor' => $quote->tax_minor,
            'total_minor' => $quote->total_minor,
            'estimated_duration_minutes' => $quote->estimated_duration_minutes,
            'customer_message' => $quote->customer_message,
            'internal_notes' => $quote->internal_notes,
            'valid_until' => $quote->valid_until?->toIso8601String(),
            'status' => $quote->status,
            'sent_at' => $quote->sent_at?->toIso8601String(),
            'accepted_at' => $quote->accepted_at?->toIso8601String(),
            'rejected_at' => $quote->rejected_at?->toIso8601String(),
            'cancelled_at' => $quote->cancelled_at?->toIso8601String(),
            'expired_at' => $quote->expired_at?->toIso8601String(),
            'converted_at' => $quote->converted_at?->toIso8601String(),
            'converted_booking_id' => $quote->relationLoaded('convertedBooking') ? $quote->convertedBooking?->id : null,
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

    private function markRequestQuoted(QuoteRequest $quoteRequest): void
    {
        $quoteRequest->update([
            'status' => 'quoted',
            'last_activity_at' => now(),
        ]);
    }

    private function syncRequestStatusAfterQuoteDeletion(QuoteRequest $quoteRequest): void
    {
        $hasRemainingQuotes = $quoteRequest->quotes()->exists();

        $quoteRequest->update([
            'status' => $hasRemainingQuotes ? 'quoted' : QuoteRequest::STATUS_SUBMITTED,
            'last_activity_at' => now(),
        ]);
    }
}
